/**
 * Spider Core
 * Created by junhao on 2017/3/20.
 */
const kue = require('kue');
const Redis = require('ioredis');
const domain = require('domain');
const loginFacebook = require('../../spider/facebook/loginFacebook');
const spiderUtils = require('../../lib/spiderUtils');

let logger, settings;
class spiderCore {
  constructor(_settings) {
    settings = _settings;
    this.settings = settings;
    this.redis = settings.redis;
    this.dealWith = new (require('./dealWith'))(this);
    this.hostTime = new (require('./hostTime'))(this);
    logger = settings.logger;
    logger.trace('spiderCore instantiation ...');
  }
  assembly() {
    this.taskDB = new Redis(`redis://:${this.redis.auth}@${this.redis.host}:${this.redis.port}/${this.redis.taskDB}`);
    this.cache_db = new Redis(`redis://:${this.redis.auth}@${this.redis.host}:${this.redis.port}/${this.redis.cache_db}`);
    const email = this.settings.facebook.auth,
      keys = [];
    for (const value of email) {
      keys.push(['sismember', 'user:Facebook', value.email]);
    }
    this.searchDB(keys);
  }
  start() {
    logger.trace('启动函数');
    this.assembly();
  }
  searchDB(keys) {
    this.taskDB.pipeline(
      keys
    ).exec((err, result) => {
      if (err) {
        logger.debug('error', err);
        return;
      }
      let auth;
      for (const [key, val] of result.entries()) {
        if (val[1] === 0) {
          auth = this.settings.facebook.auth[key];
          break;
        }
      }
      if (!auth) {
        spiderUtils.sendError(this.taskDB, 'Facebook当前没有可用账号', () => {
          process.exit();
        });
        return;
      }
      this.auth = auth;
      this.getCookie(auth, () => {
        // process.env.NODE_ENV = 'production';
        if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') {
          this.deal();
        } else {
          this.test();
        }
      });
    });
  }
  getCookie(auth, callback) {
    const parameter = {
      loginAddr: this.settings.facebook.loginAddr,
      timeout: 0,
      auth
    };
    loginFacebook.start(parameter, (err, result) => {
      if (err) {
        logger.debug('当前用户不可用', err);
        callback();
        return;
      }
      this.cookies = result;
      if (callback) {
        callback();
      }
    });
  }
  test() {
    const work = {
      bid: 374308376088256,
      aid: '672291569623267',
      p: 40,
      taskType: 0,
      commentId: 0,
      commentTime: 0,
      commentNum: 0,
      cookies: this.cookies
    };
    if (Number(work.taskType) === 1) {
      this.hostTime.todo(work, (err, hostTotal, timeTotal) => {
        logger.debug(hostTotal);
        logger.debug(timeTotal);
        logger.debug('end');
      });
    } else {
      this.dealWith.todo(work, (err, total, lastId, lastTime, addCount) => {
        logger.debug(total);
        logger.debug(lastId);
        logger.debug(lastTime);
        logger.debug(addCount);
        logger.debug('end');
      });
    }
  }

  deal() {
    const queue = kue.createQueue({
      prefix: 'c',
      redis: {
        port: this.redis.port,
        host: this.redis.host,
        auth: this.redis.auth,
        db: this.redis.jobDB
      }
    });
    queue.on('error', (err) => {
      logger.error('Oops... ', err);
    });
    // queue.watchStuckJobs(1000);
    logger.trace('Queue get ready');
    queue.process('comment_Facebook', this.settings.concurrency, (job, done) => {
      logger.trace('Get facebook task!');
      const work = job.data,
        key = `c:${work.p}:${work.aid}`;
      work.cookies = this.cookies;
      logger.info(work);
      const d = domain.create();
      d.on('error', (err) => {
        done(err);
      });
      d.run(() => {
        this.dealWith.todo(work, (err, total, lastId, lastTime, addCount) => {
          if (err) {
            return done(err);
          }
          logger.debug(total);
          logger.debug(lastId);
          logger.debug(lastTime);
          logger.debug(addCount);
          logger.debug('end');
          done(null);
          this.taskDB.hmset(key, 'update', (new Date().getTime()), 'comment_number', total, 'last_comment_id', lastId, 'last_comment_time', lastTime);
        });
      });
    });
    queue.process('comment_update_Facebook', this.settings.concurrency, (job, done) => {
      logger.trace('Get facebook task!');
      const work = job.data,
        key = `c:${work.p}:${work.aid}`;
      logger.info(work);
      const d = domain.create();
      d.on('error', (err) => {
        done(err);
      });
      d.run(() => {
        this.dealWith.todo(work, (err, hostTotal, timeTotal) => {
          if (err) {
            done(err);
            return;
          }
          logger.debug(hostTotal);
          logger.debug(timeTotal);
          logger.debug('end');
          done(null);
          this.taskDB.hmset(key, 'update', (new Date().getTime()));
        });
      });
    });
  }
}
module.exports = spiderCore;