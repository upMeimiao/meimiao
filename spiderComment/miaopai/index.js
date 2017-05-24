/**
 * Spider Core
 * Created by junhao on 2017/2/08.
 */
const kue = require('kue');
const myRedis = require('../../lib/myredis.js');
const async = require('async');
const domain = require('domain');

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
    async.parallel([
      (callback) => {
        myRedis.createClient(this.redis.host,
          this.redis.port,
          this.redis.taskDB,
          this.redis.auth,
          (err, cli) => {
            if (err) {
              callback(err);
              return;
            }
            this.taskDB = cli;
            logger.debug('任务信息数据库连接建立...成功');
            callback();
          }
        );
      },
      (callback) => {
        myRedis.createClient(this.redis.host,
          this.redis.port,
          this.redis.cache_db,
          this.redis.auth,
          (err, cli) => {
            if (err) {
              callback(err);
              return;
            }
            this.cache_db = cli;
            logger.debug('缓存队列数据库连接建立...成功');
            callback();
          }
        );
      }
    ], (err) => {
      if (err) {
        logger.error('连接redis数据库出错。错误信息：', err);
        logger.error('出现错误，程序终止。');
        process.exit();
        return;
      }
      logger.debug('创建数据库连接完毕');
      if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') {
        this.deal();
      } else {
        this.test();
      }
    });
  }
  start() {
    logger.trace('启动函数');
    this.assembly();
  }
  test() {
    const work = {
      bid: 'WevtTZkNmg19jwaS',
      aid: 'kmlnbQef3VZ3exNW5A9zOg__',
      p: 7,
      taskType: 0,
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
    queue.process('comment_miaopai', this.settings.concurrency, (job, done) => {
      logger.trace('Get miaopai task!');
      const work = job.data,
        key = `c:${work.p}:${work.aid}`;
      logger.info(work);
      const d = domain.create();
      d.on('error', (err) => {
        done(err);
      });
      d.run(() => {
        this.dealWith.todo(work, (err, total, lastId, lastTime, addCount) => {
          if (err) {
            done(err);
            return;
          }
          done(null);
          this.taskDB.hmset(key, 'update', (new Date().getTime()), 'comment_number', total, 'last_comment_id', lastId, 'last_comment_time', lastTime);
        });
      });
    });
    queue.process('comment_update_miaopai', this.settings.concurrency, (job, done) => {
      logger.trace('Get miaopai task!');
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