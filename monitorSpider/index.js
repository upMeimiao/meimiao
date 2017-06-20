/**
 * Spider Core
 * created by zhupenghui on 17/6/12.
 */
const kue = require( 'kue' );
const request = require('request');
const Redis = require( 'ioredis' );
const async = require( 'neo-async' );
const domain = require('domain');
const events = require('events');
const platfrom = require('./controllers/platform');
const schedule = require('node-schedule');

let logger,settings;
class spiderCore extends events{
  constructor(_settings) {
    super();
    settings = _settings;
    this.settings = settings;
    this.redis = settings.redis;
    this.proxy = new (require('./proxy'))(this);
    this.getTask = new (require('./controllers/beginTask'))(this);
    logger = settings.logger;
    logger.trace('spiderCore instantiation ...')
  }
  assembly() {
    // 连接存储正确数据的缓存库
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
    })
  }
  getH(callback) {
    this.xiaoyingDeal.getH((err, result) => {
      if (err) {
        return
      }
      this.h = result;
      if (callback) {
        callback()
      }
    })
  }
  initPlatForm() {
    let platfromArr = [];
    for (const [key, value] of platfrom.entries()) {
      platfromArr.push({ name: value, platform: new (require('./dealWith/' + value))(this) });
    }
    this.beginTask(platfromArr);
    platfromArr = null;
  }
  beginTask(plat) {
    // 并行执行任务
    const queue = async.queue((task, callback) => {
      this.getTask.start(task.name, task.platform, (err) => {
        if (err) {
          this.emit('error', err);
          return;
        }
        callback();
      });
    }, 5);
    // 当并发任务完成
    queue.drain = () => {
      logger.debug('任务处理完毕');
    };
    // 任务添加
    queue.push(plat, (err) => {
      if (err) {
        this.emit('error', err);
        return;
      }
    });
  }
  error_event(message) {
    /**
     *  用来处理错误信息，并发送邮件通知哪个监控平台挂掉了
     * */
    logger.debug('error:', message);
    return;
  }
}
module.exports = spiderCore;