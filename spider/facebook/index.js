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
    // 正常使用的cookie
    this.cookies = 'reg_fb_gate=https%3A%2F%2Fwww.facebook.com%2Flogin.php;reg_fb_ref=https%3A%2F%2Fwww.facebook.com%2Flogin.php;datr=nA_KWVYcuAd_hATD4VP3TTY-;wd=800x600;sfau=AYgx2_eZiEbozayFZjrI3YEGpIkcgD15x7y1KHirT4AEf12uu_MdVWw1ZCqM84k9WZBfk6oWSvenIsZvkgQlWzTaaqmE4ZS6RzMOymN3SlBMiy4x953Pbw19wj6tgagQvMvg14tG_okCWfK5Qk_JfGp-;fr=0prUIDUH7GnPPCECX..BZyg-c.6q.AAA.0.0.BZyg-e.AWWFpcU-;_js_datr=nA_KWVYcuAd_hATD4VP3TTY-;_js_reg_fb_ref=https%3A%2F%2Fwww.facebook.com%2Flogin.php%3Flogin_attempt%3D1%26lwv%3D100;';
    // 已失效的cookie测试
    // this.cookies = 'datr=74GnWb2Z9O9Dgi6DQrRDrh1m; sb=74GnWWSmA-3w7GeHfTVlpQrC; c_user=100017345710792; xs=48%3ArxJo9wL-uCsnhg%3A2%3A1504151954%3A-1%3A-1; pl=n; fr=0DuLGK4OE8rrFViVo.AWXr_Tgk282II-5h_t0zeB_o5zs.BZo4-t.li.Fmn.0.0.BZp4mX.AWW1Olu3; presence=EDvF3EtimeF1504151960EuserFA21B17345710792A2EstateFDutF1504151959998CEchFDp_5f1B17345710792F2CC; wd=1064x974';
    const { logger: Logger } = this.settings;
    logger = Logger;
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
    this.taskDB.pipeline(keys)
      .exec((err, result) => {
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
        // this.getCookie(auth, () => {
        // process.env.NODE_ENV = 'production';
        if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') {
          this.deal();
        } else {
          this.test();
        }
        // });
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
      logger.info(this.cookies);
      if (callback) {
        callback();
      }
    });
  }
  test() {
    const work = {
      id: '100003896634272',
      name: 'REN T RTIANA',
      p: 40,
      cookies: this.cookies
    };
    this.dealWith.todo(work, (err, total) => {
      if (err) {
        // console.log(err);
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
          request.post(
            settings.origin_update,
            { form: { key, time: new Date().getTime(), total } }
          );
          request.post(
            settings.update,
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
            }
          );
        });
      });
    });
  }
}
module.exports = spiderCore;