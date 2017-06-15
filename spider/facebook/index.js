/**
 * Spider Core
 * Created by junhao on 17/4/12.
 */
const kue = require('kue');
const request = require('request');
const domain = require('domain');
const Redis = require('ioredis');
const loginFacebook = require('./loginFacebook');
const spiderUtils = require('../../lib/spiderUtils');

let logger, settings;
class spiderCore {
  constructor(_settings) {
    settings = _settings;
    this.settings = settings;
    this.redis = settings.redis;
    this.dealWith = new (require('./dealWith'))(this);
    this.cookies = '';
    logger = settings.logger;
    logger.trace('spiderCore instantiation ...');
  }
  assembly() {
    this.taskDB = new Redis(`redis://:${this.redis.auth}@${this.redis.host}:${this.redis.port}/${this.redis.taskDB}`);
    this.cache_db = new Redis(`redis://:${this.redis.auth}@${this.redis.host}:${this.redis.port}/${this.redis.cache_db}`);
    const email = this.settings.spiderAPI.facebook.auth,
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
          auth = this.settings.spiderAPI.facebook.auth[key];
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
      loginAddr: this.settings.spiderAPI.facebook.loginAddr,
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
      id: '477313339136839',
      name: '陈翔六点半',
      p: 40,
      cookies: this.cookies
    };
    this.dealWith.todo(work, (err, total) => {
      if (err) {
        return;
      }
      logger.debug(total);
      logger.debug('end');
    });
  }

  deal() {
    const queue = kue.createQueue({
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
    // queue.watchStuckJobs( 1000 );
    logger.trace('Queue get ready');
    kue.Job.rangeByType('Facebook', 'active', 0, 100, 'asc', (err, jobs) => {
      jobs.forEach((job) => {
        job.inactive();
      });
    });
    queue.process('Facebook', this.settings.concurrency, (job, done) => {
      logger.trace('Get Facebook task!');
      const work = job.data,
        key = `${work.p}:${work.id}`;
      work.cookies = this.cookies;
      logger.info(work);
      const d = domain.create();
      d.on('error', (err) => {
        done(err);
      });
      d.run(() => {
        this.dealWith.todo(work, (error, total) => {
          if (error) {
            done(error);
            return;
          }
          done(null);
          request.post(settings.origin_update,
            { form: { key, time: new Date().getTime(), total } });
          request.post(settings.update,
            { form: { platform: work.p, bid: work.id } },
            (err, res, body) => {
              if (err) {
                logger.error('occur error : ', err);
                return;
              }
              if (res.statusCode !== 200) {
                logger.error(`状态码${res.statusCode}`);
                logger.info(res);
                return;
              }
              try {
                body = JSON.parse(body);
              } catch (e) {
                logger.info('不符合JSON格式');
                return;
              }
              if (Number(body.errno) === 0) {
                logger.info(body.errmsg);
              } else {
                logger.info(body);
              }
            });
        });
      });
    });
  }
}
module.exports = spiderCore;