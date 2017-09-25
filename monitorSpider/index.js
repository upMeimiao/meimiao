/**
 * Spider Core
 * created by zhupenghui on 17/6/12.
 */
const request = require('../lib/request'),
  Redis = require( 'ioredis' ),
  async = require( 'neo-async' ),
  zlib = require('zlib'),
  events = require('events'),
  req = require('request'),
  cheerio = require('cheerio'),
  URL = require('url'),
  crypto = require('crypto'),
  fetchUrl = require('fetch').fetchUrl,
  platfrom = require('./controllers/platform'),
  infoCheck = require('./controllers/infoCheck'),
  program = require('./controllers/program'),
  vm = require('vm');

let logger, settings;
class spiderCore extends events{
  constructor(_settings) {
    super();
    settings = _settings;
    this.settings = settings;
    this.redis = settings.redis;
    this.modules = {
      request, infoCheck, cheerio, async, req, zlib, URL, crypto, fetchUrl, vm
    };
    this.h = '';
    this.time = '';
    logger = settings.logger;
    logger.trace('spiderCore instantiation ...');
    _settings = null;
  }
  assembly() {
    // 连接存储数据的缓存库
    this.MSDB = new Redis(`redis://:${this.redis.auth}@${this.redis.host}:6379/${this.redis.MSDB}`, {
      reconnectOnError(err) {
        return err.message.slice(0, 'READONLY'.length) === 'READONLY';
      }
    });
    this.getH();
  }
  start() {
    this.assembly();
    this.on('error', (massage) => {
      this.error_event(massage);
    });
    setTimeout(() => {
      process.exit(0);
    }, 3600000);
  }
  getH() {
    const options = { method: 'POST',
      url: 'http://viva.api.xiaoying.co/api/rest/d/dg',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'XiaoYing/5.3.5 (iPhone; iOS 10.1.1; Scale/3.00)'
      },
      form: {
        a: 'dg',
        b: '1.0',
        c: '20007700',
        e: 'DIqmr4fb',
        i: '{"a":"[I]a8675492c8816a22c28a1b97f890ae144a8a4fa3","b":"zh_CN"}',
        j: '6a0ea6a13e76e627121ee75c2b371ef2',
        k: 'xysdkios20130711'
      }
    };
    this.modules.req(options, (error, response, body) => {
      if (error) {
        callback(error);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        callback(e);
        return;
      }
      this.h = body.a.a;
      this.time = new Date().getTime();
      this.initPlatForm();
    });
  }
  initPlatForm() {
    // 实例化平台模块
    let platfromObj = {},
      videoList = [],
      programList = [],
      commentList = [];
    this.getTask = new (require('./controllers/beginTask'))(this);
    switch (this.settings.type) {
      case 'video':
        // for (const [key, value] of platfrom.entries()) {
        //   videoList.push({ name: value, type: '', t: 'video', platform: new (require('./dealWith/' + value))(this) });
        // }
        videoList.push({ name: 'baijia', type: 'ceshi', t: 'video', platform: new (require('./dealWith/baijia'))(this) });
        platfromObj = { videoList };
        break;
      case 'program':
        for (const [key, value] of platfrom.entries()) {
          if (program.program().get(key)) {
            programList.push({ name: value, type: '', t: 'program', platform: new (require('./program/' + value))(this) });
          }
        }
        platfromObj = { programList };
        break;
      case 'comment':
        for (const [key, value] of platfrom.entries()) {
          if (program.program().get(key)) {
            commentList.push({ name: value, type: '', t: 'comment', platform: new (require('./comment/' + value))(this) });
          }
        }
        // commentList.push({ name: 'meimiao', type: '', t: 'comment', platform: new (require('./comment/meimiao'))(this) });
        platfromObj = { commentList };
        break;
      default:
        for (const [key, value] of platfrom.entries()) {
          videoList.push({ name: value, type: '', t: 'video', platform: new (require('./dealWith/' + value))(this) });
        }
        platfromObj = { videoList };
    }
    this.distribution(platfromObj);
    this.modules = null; videoList = null; programList = null;
  }
  distribution(platfromObj) {
    const iterator = (plat, done) => {
      this.beginTask(plat);
      done();
    };
    async.each(platfromObj, iterator, () => {
    //  监控分类执行完毕
      platfromObj = null;
    });
  }
  beginTask(plat) {
    // 并行执行任务
    const time = new Date().getHours(),
      queue = async.queue((task, callback) => {
        if (task.name === 'ku6' || task.name === 'weishi' || task.name === 'youliao' || task.name === 'weibo') {//  || task.name === 'weibo'
          callback();
          return;
        }
        this.getTask.start(task, () => {
          task = null;
          callback();
        });
      }, 15);
    // 当并发任务完成
    queue.drain = () => {
      logger.debug('任务处理完毕');
      if (time - this.time >= 86400000) {
        this.getH();
        return;
      }
      if ((time >= 19 && time <= 23) || (time >= 0 && time <= 7)) {
        setTimeout(() => {
          this.beginTask(plat);
          plat = null;
        }, 25000);
        return;
      }
      setTimeout(() => {
        this.beginTask(plat);
        plat = null;
      }, 20000);
    };
    // 任务添加
    queue.push(plat, (err) => {
      if (err) {
        this.emit('error', { error: err, platform: plat.name });
        plat = null;
        return;
      }
    });
  }
  error_event(message) {
    /**
     *  用来处理错误信息，并发送邮件通知哪个监控平台挂掉了
     * */
    logger.debug('return-error:', message);
    infoCheck.interface(events, message, 'p-error');
    message = null;
    return;
  }
}
module.exports = spiderCore;