const request = require('request');

let logger, settings;
class proxyInfo {
  constructor(_core) {
    this.core = _core;
    settings = _core.settings;
    logger = settings.logger;
    if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') {
      this.host = settings.proxy.weiboHost;
    } else {
      this.host = settings.proxy.host;
    }
    logger.trace('Proxy module instantiation');
  }
  getProxy(callback) {
    const proxy = '';
    let proxyStatus = false;
    if (proxyStatus && proxy) {
      callback(null, proxy);
    } else {
      this.need(0, (err, _proxy) => {
        if (err) {
          if (err === 'timeout!') {
            callback(null, 'timeout!');
            return;
          }
          logger.error('Get proxy occur error:', err.message);
          proxyStatus = false;
          this.back(_proxy, false);
          callback(null, false);
          return;
        }
        callback(null, _proxy);
      });
    }
  }
  need(times, callback) {
    if (times > 4) {
      callback('timeout!');
      return;
    }
    logger.trace('Send a Require command');
    request(`http://${this.host}:${settings.proxy.port}`, (err, res, body) => {
      if (err) {
        logger.debug('err:', err);
        setTimeout(() => {
          this.need(times + 1, callback);
        }, 5000);
        return;
      }
      let proxy;
      try {
        proxy = JSON.parse(body);
      } catch (e) {
        logger.error('Decode response occur error!');
        callback(e.message);
        return;
      }
      if (proxy.proxy) {
        logger.debug(proxy.proxy);
        callback(null, proxy.proxy);
        return;
      }
      setTimeout(() => {
        logger.debug('setTImeout');
        this.need(times + 1, callback);
      }, 8000);
    });
  }

  back(proxy, status, callback) {
    request.post(`http://${this.host}:${settings.proxy.port}/?proxy=${proxy}&status=${status}`, (err, res) => {
      if (err) {
        if (callback) {
          callback(res);
          return;
        }
      }
      if (callback) {
        callback(res);
      }
    });
  }
}
module.exports = proxyInfo;