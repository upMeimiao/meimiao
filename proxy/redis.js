const Redis = require('ioredis');
const async = require('neo-async');
const os = require('os');

let logger, settings;

class redis {
  constructor(proxy) {
    settings = proxy.settings;
    logger = settings.logger;
    this.password = settings.redis.auth;
    this.port = settings.redis.port;
    this.host = settings.redis.host;
    this.db = settings.redis.proxy;
    logger.debug('redis模块 实例化...');
  }
  ready(callback) {
    let keyPrefix;
    switch (os.hostname()) {
      case 'servant_3':
        keyPrefix = 'weibo_';
        break;
      case 'iZm5e5rntb358m27cwxt15Z':
        keyPrefix = 'toutiao_';
        break;
      default:
        keyPrefix = 'weibo_';
    }
    this.client = new Redis(this.port, this.host, { password: this.password, keyPrefix:  keyPrefix});
    // this.client = Redis.createClient(this.port, this.host, { detect_buffers: true });
    // this.client.auth(this.password);
    this.client.select(this.db, (err) => {
      if (err) {
        logger.error('选择数据库出现错误');
        callback(err);
        return;
      }
      callback(null, true);
    });
  }
  saveProxy(proxy, callback) {
    const db = this.client;
    const length = proxy.length;
    let i = 0;
    logger.debug(length);
    async.whilst(
      () => i < length,
      (cb) => {
        db.zscore('bproxy', proxy[i], (err, result) => {
          if (result) {
            i += 1;
            cb();
            return;
          }
          db.sadd('proxy', proxy[i], (error) => {
            if (error) {
              i += 1;
              return cb();
            }
            i += 1;
            return cb();
          });
        });
      },
      (err, result) => callback(err, result)
    );
  }
  borrow(callback) {
    const db = this.client;
    db.spop('proxy', (err, proxy) => {
      if (err) {
        logger.error('获取代理出现错误');
        callback(err);
        return;
      }
      if (!proxy) {
        // 没有代理可用
        // 稍后再试
        callback(null, true);
        return;
      }
      // logger.debug('borrow:', proxy)
      let i = 0;
      const time = parseInt(Date.now() / 1000, 10);
      db.zrangebyscore('bproxy', '-inf', time - 120, (error, result) => {
        async.whilst(
          () => i < result.length,
          (cb) => {
            db.zrem('bproxy', result[i]);
            db.sadd('proxy', result[i]);
            i += 1;
            cb();
          },
          () => {
            db.zadd('bproxy', time, proxy);
            return callback(null, null, proxy);
          }
        );
      });
    });
  }
  back(data, callback) {
    const db = this.client;
    // data.status = data.status === 'true';
    if (data.proxy === 'timeout') {
      callback();
      return;
    }
    // logger.debug('back:', data)
    db.zscore('bproxy', data.proxy, (err, proxy) => {
      if (proxy) {
        if (data.status === 'true') {
          db.zrem('bproxy', data.proxy);
          db.sadd('proxy', data.proxy);
          callback();
        } else {
          // logger.error('back:', data)
          db.get(data.proxy, (error, result) => {
            if (!result || Number(result) < 2) { // 2
              db.incr(data.proxy);
              db.zrem('bproxy', data.proxy);
              db.sadd('proxy', data.proxy);
              db.expire(data.proxy, 1800);// 1800
              callback();
            } else {
              db.zrem('bproxy', data.proxy);
              db.del(data.proxy);
              callback();
            }
          });
        }
      } else {
        callback();
      }
    });
  }
}
module.exports = redis;