/**
 * Spider Core
 * created by zhupenghui on 17/6/12.
 */
const request = require('../lib/request');
const Redis = require( 'ioredis' );
const async = require( 'neo-async' );
const zlib = require('zlib');
const events = require('events');
const req = require('request');
const platfrom = require('./controllers/platform');
const infoCheck = require('./controllers/infoCheck');
const cheerio = require('cheerio');

let logger,settings;
class spiderCore extends events{
  constructor(_settings) {
    super();
    settings = _settings;
    this.settings = settings;
    this.redis = settings.redis;
    this.modules = {
      request, infoCheck, cheerio, async, req, zlib
    };
    this.proxy = new (require('./controllers/proxy'))(this);
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
    let platfromArr = [];
    this.getTask = new (require('./controllers/beginTask'))(this);
    for (const [key, value] of platfrom.entries()) {
      platfromArr.push({ name: value, type: 'ceshi', platform: new (require('./dealWith/' + value))(this) });
    }
    // platfromArr.push({ name: 'eyepetizer', type: 'ceshi', platform: new (require('./dealWith/eyepetizer'))(this) });
    this.beginTask(platfromArr);
    platfromArr = null;
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
        }, 20000);
      } else {
        setTimeout(() => {
          this.beginTask(plat);
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