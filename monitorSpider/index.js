/**
 * Spider Core
 * Created by liuze on 17/2/7.
 * updated by zhupenghui on 17/6/12.
 */
const kue = require( 'kue' );
const request = require('request');
const Redis = require( 'ioredis' );
const async = require( 'async' );
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
    this.getTask = new (require('./controllers/getTask'))(this);
    logger = settings.logger;
    logger.trace('spiderCore instantiation ...')
  }
  assembly() {
    // 连接存储正确数据的缓存库
    this.MSDB = new Redis(`redis://:${this.redis.auth}@${this.redis.host}:6379/${this.redis.MSDB}`,{
      reconnectOnError(err) {
        return err.message.slice(0, 'READONLY'.length) === 'READONLY';
      }
    });
    this.initPlatForm();
  }
  start() {
    this.assembly();
    this.on('error', (massage) => {
      this.error_event(message);
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
    let platfromArr = [],
      i = 0;
    for (const [key, value] of platfrom.entries()) {
      platfromArr[i] = new (require('./dealWith/' + value))(this);
      i += 1;
    }
    this.beginTask(platfromArr);
    platfromArr = null;
  }
  beginTask(plat) {
    // 并行执行任务
    const queue = async.queue((task, callback) => {
      this.getTask.youku(task, (err) => {
        if (err) {
          this.emit('error', err);
          return;
        }
        callback();
      });
    },1);
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