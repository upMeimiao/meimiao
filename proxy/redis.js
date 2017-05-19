const Redis = require('redis');
const async = require('async');

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
    this.client = Redis.createClient(this.port, this.host, { detect_buffers: true });
    this.client.auth(this.password);
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
          db.sadd('proxy', proxy, (error) => {
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
      db.ZRANGEBYSCORE('bproxy', '-inf', time - 120, (error, result) => {
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
    // logger.debug('back:', data)
    const db = this.client;
    data.status = data.status ? data.status : false;
    db.zscore('bproxy', data.proxy, (err, proxy) => {
      if (proxy) {
        // logger.debug('back:', data)
        if (data.status) {
          db.zrem('bproxy', data.proxy);
          db.sadd('proxy', data.proxy);
          return callback();
        }
        db.get(data.proxy, (error, result) => {
          if (!result || Number(result) < 2) { // 2
            db.incr(data.proxy);
            db.zrem('bproxy', data.proxy);
            db.sadd('proxy', data.proxy);
            db.expire(data.proxy, 900);// 1800
            return callback();
          }
          db.zrem('bproxy', data.proxy);
          db.del(data.proxy);
          return callback();
        });
      }
      return callback();
    });
  }
}
module.exports = redis;