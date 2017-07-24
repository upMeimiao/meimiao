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
  program = require('./controllers/program');

let logger,settings;
class spiderCore extends events{
  constructor(_settings) {
    super();
    settings = _settings;
    this.settings = settings;
    this.redis = settings.redis;
    this.modules = {
      request, infoCheck, cheerio, async, req, zlib, URL, crypto, fetchUrl
    };
    // this.proxy = new (require('./controllers/proxy'))(this);
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
    this.initPlatForm();
  }
  start() {
    this.assembly();
    this.on('error', (massage) => {
      this.error_event(massage);
    });
  }
  initPlatForm() {
    // 实例化平台模块
    let platfromObj = {},
      videoList = [],
      programList = [];
    this.getTask = new (require('./controllers/beginTask'))(this);
    switch (this.settings.type) {
      case 'video':
        for (const [key, value] of platfrom.entries()) {
          videoList.push({ name: value, type: '', t: 'video', platform: new (require('./dealWith/' + value))(this) });
        }
        platfromObj = { videoList };
        break;
      case 'program':
        for (const [key, value] of platfrom.entries()) {
          if (program.program().get(key)) {
            programList.push({ name: value, type: 'ceshi', t: 'program', platform: new (require('./program/' + value))(this) });
          }
        }
        platfromObj = { programList };
        break;
      case 'all':
        for (const [key, value] of platfrom.entries()) {
          videoList.push({ name: value, type: '', t: 'video', platform: new (require('./dealWith/' + value))(this) });
          if (program.program().get(key)) {
            programList.push({ name: value, type: 'ceshi', t: 'program', platform: new (require('./program/' + value))(this) });
          }
        }
        platfromObj = { videoList, programList };
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
        this.getTask.start(task, () => {
          task = null;
          callback();
        });
      }, 30);
    // 当并发任务完成
    queue.drain = () => {
      logger.debug('任务处理完毕');
      if ((time >= 19 && time <= 23) || (time >= 0 && time <= 7)) {
        setTimeout(() => {
          this.beginTask(plat);
          plat = null;
        }, 20000);
      } else {
        setTimeout(() => {
          this.beginTask(plat);
          plat = null;
        }, 12000);
      }
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
    message = null;
    return;
  }
}
module.exports = spiderCore;