/**
 * Spider Core
 * Created by yunsong on 16/7/28.
 */
const kue = require('kue');
const request = require('request');
const Redis = require('ioredis');
const domain = require('domain');

let logger, settings;
class spiderCore {
  constructor(_settings) {
    settings = _settings;
    this.settings = settings;
    this.redis = settings.redis;
    this.dealWith = new (require('./dealWith'))(this);
    // this.getProgram = new (require('./getProgram'))(this);
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
      id: '355880651',
      p: '12',
      name: '科技曼曼谈',
      encodeId: 'UMTQyMzUyMjYwNA',
      mapBid: '355880651'
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
    queue.process('tudou', this.settings.concurrency, (job, done) => {
      logger.trace('Get tudou task!');
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
          request.post(settings.update,
            { form: { platform: work.p, bid: work.id } },
            (error, res, body) => {
              if (error) {
                logger.error('occur error : ', error);
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