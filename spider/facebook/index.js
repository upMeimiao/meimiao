/**
 * Spider Core
 * Created by junhao on 17/4/12.
 */
const kue = require('kue');
const request = require('request');
const myRedis = require('../../lib/myredis.js');
const async = require('async');
const domain = require('domain');
const loginFacebook = require('./loginFacebook');
const changeState = require('./changeState');
const spiderUtils = require('../../lib/spiderUtils');

let logger, settings;
class spiderCore {
  constructor(_settings) {
    settings = _settings;
    this.settings = settings;
    this.redis = settings.redis;
    this.dealWith = new (require('./dealWith'))(this);
    // this.changeState = new (require('./changeState.js'))(this);
    this.cookies = '';
    // this.index = 0;
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
            callback(null);
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
      const email = this.settings.spiderAPI.facebook.auth,
        keys = [];
      for (const value of email) {
        // logger.debug(value.email);
        // this.searchDB(value.email);
        keys.push(value.email);
      }
      this.searchDB(keys);
    });
  }
  start() {
    logger.trace('启动函数');
    this.assembly(this.index);
  }
  searchDB(keys) {
    let index = 0, auth;
    const length = keys.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.taskDB.EXISTS(`user:Facebook:${keys[index]}`, keys[index], (err, result) => {
          if (err) {
            logger.debug('查询出错: ', err);
            return;
          }
          if (result === 1) {
            logger.debug('当前facebook账户被封禁: ', keys[index]);
            index += 1;
            cb();
            return;
          }
          if (result === 0) {
            process.env.NODE_ENV = 'production';
            changeState.start();
            auth = this.settings.spiderAPI.facebook.auth[index];
            this.getCookie(auth, () => {
              if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') {
                this.deal(auth);
              } else {
                this.test(auth);
              }
            });
            return;
          }
          index += 1;
          cb();
        });
      },
      () => {
        logger.debug('没有可用账号');
        spiderUtils.sendError(this.taskDB, '没有可用账号', () => {
          process.exit();
        });
      }
    );
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
  test(auth) {
    const work = {
      id: 1452851595021771,
      name: '二更视频',
      p: 40,
      cookies: this.cookies
    };
    this.dealWith.todo(work, (err, total) => {
      if (err) {
        if (err == '500') {
          const email = auth.email;
          spiderUtils.sendError(this.taskDB, email, () => {
            process.exit();
          });
        }
        return;
      }
      logger.debug(total);
      logger.debug('end');
    });
  }

  deal(auth) {
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
            if (error == '500') {
              const email = auth.email;
              spiderUtils.sendError(this.taskDB, email, () => {
                process.exit();
              });
              return;
            }
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