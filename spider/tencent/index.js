/**
 * Spider Core
 * Created by junhao on 16/6/20.
 */
const kue = require('kue');
const request = require('request');
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
      id: 'c039148704fc57cf2532f783f354df07',
      name: 'VICE中国',
      p: 4
    };
    this.dealWith.todo(work, (err, total) => {
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
    queue.watchStuckJobs(1000);
    logger.trace('Queue get ready');
    queue.process('tencent', this.settings.concurrency, (job, done) => {
      logger.trace('Get tencent task!');
      let work = job.data,
        key = `${work.p}:${work.id}`;
      logger.info(work);
      const d = domain.create();
      d.on('error', (err) => {
        done(err);
      });
      d.run(() => {
        this.dealWith.todo(work, (err, total) => {
          if (err) {
            return done(err);
          }
          this.taskDB.hmset(key, 'update', (new Date().getTime()), 'video_number', total, (err, result) => {
            done(null);
          });
          request.post(settings.update, { form: { platform: work.p, bid: work.id } }, (err, res, body) => {
            if (err) {
              logger.error('occur error : ', err);
              return;
            }
            if (res.statusCode != 200) {
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
            if (body.errno == 0) {
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