/**
 * Spider Core
 * Created by junhao on 16/6/22.
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
      id: '1189512325',
      name: '迷迭香Rosemary_',
      p: 2
    };
    // this.dealWith.todo(work, (err, total) => {
    //   logger.debug(total);
    //   logger.debug('end');
    // });
    const workSingle = {
      p: 2,
      id: '1059582818',
      url: 'http://www.iqiyi.com/w_19rsgrjr1l.html?list=19rrhem2xy#vfrm=8-8-0-1',
      aid: '2355015109',
      title: '【新片场发行】出走云南'
    };
    this.dealWith.goto(workSingle, (err, message) => {
      if (err) {
        logger.error(err);
      } else {
        logger.debug(message);
      }
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
    // queue.watchStuckJobs( 1000 )
    logger.trace('Queue get ready');
    queue.process('iqiyi', this.settings.concurrency, (job, done) => {
      logger.trace('Get iqiyi task!');
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
    queue.process('iqiyi_single', 2, (job, done) => {
      logger.trace('Get iqiyi_single task!');
      const work = job.data;
      logger.info(work);
      const d = domain.create();
      d.on('error', (err) => {
        done(err);
      });
      d.run(() => {
        this.dealWith.goto(work, (err, message) => {
          if (err) {
            logger.error(err);
          } else {
            logger.debug(message);
          }
        });
      });
    });
  }
}
module.exports = spiderCore;