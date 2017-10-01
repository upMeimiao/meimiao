/**
 * Spider Core
 * Created by zhupenghui on 2017/7/4.
 */
const kue = require('kue');
const domain = require('domain');
const Redis = require('ioredis');

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
    if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') {
      this.deal();
    } else {
      this.test();
    }
  }
  start() {
    logger.trace('启动函数');
    this.assembly();
  }
  test() {
    const work = {
      bid: '1469921220934174',
      aid: 'pS6JvPTFnHH3m5Rs',
      p: 50,
      taskType: 1,
      commentId: 0,
      commentTime: 0,
      commentNum: 0
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
    queue.process('comment_shanka', this.settings.concurrency, (job, done) => {
      logger.trace('Get shanka task!');
      const work = job.data,
        key = `c:${work.p}:${work.aid}`;
      logger.info(work);
      const d = domain.create();
      d.on('error', (err) => {
        done(err);
      });
      d.run(() => {
        this.dealWith.todo(work, (err, total, lastId, lastTime) => {
          if (err) {
            done(err);
            return;
          }
          done(null);
          this.taskDB.hmset(key, 'update', (new Date().getTime()), 'comment_number', total, 'last_comment_id', lastId, 'last_comment_time', lastTime);
        });
      });
    });
    queue.process('comment_update_shanka', this.settings.concurrency, (job, done) => {
      logger.trace('Get shanka task!');
      const work = job.data,
        key = `c:${work.p}:${work.aid}`;
      logger.info(work);
      const d = domain.create();
      d.on('error', (err) => {
        done(err);
      });
      d.run(() => {
        this.dealWith.todo(work, (err) => {
          if (err) {
            done(err);
            return;
          }
          done(null);
          this.taskDB.hmset(key, 'update', (new Date().getTime()));
        });
      });
    });
  }
}
module.exports = spiderCore;