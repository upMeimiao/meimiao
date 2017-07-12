/**
 * Created by ifable on 16/9/8.
 */
const kue = require('kue');
const request = require('../../lib/request.js');
const Redis = require('ioredis');
const domain = require('domain');

let logger, settings;
class spiderCore {
  constructor(_settings) {
    settings = _settings;
    this.settings = settings;
    this.redis = settings.redis;
    this.request = request;
    this.dealWith = new (require('./dealWith'))(this);
    // this.getProgram = new (require('./program'))(this);
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
      id: '290232533',
      p: '21',
      name: '一介视频'
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
    // queue.watchStuckJobs(1000);
    logger.trace('Queue get ready');
    queue.process('tv56', this.settings.concurrency, (job, done) => {
      logger.trace('Get tv56 task!');
      const work = job.data,
        key = `${work.p}:${work.id}`;
      logger.info(work);
      const d = domain.create();
      d.on('error', (err) => {
        done(err);
      });
      d.run(() => {
        this.dealWith.todo(work, (err, total) => {
          if (err) {
            done(err);
            return;
          }
          done(null);
          this.taskDB.hmset(key, 'update', (new Date().getTime()), 'video_number', total);
          request.post(logger,
            { url: settings.update, data: { platform: work.p, bid: work.id } },
            (error, result) => {
              if (error) {
                return;
              }
              try {
                result = JSON.parse(result.body);
              } catch (e) {
                logger.info('不符合JSON格式');
                return;
              }
              if (Number(result.errno) === 0) {
                logger.info(result.errmsg);
              } else {
                logger.info(result);
              }
            });
        });
      });
    });
  }
}
module.exports = spiderCore;