const request = require('request');

let logger,settings;
class Proxy {
  constructor(_core) {
    this.core = _core;
    settings = _core.settings;
    logger = settings.logger;
    logger.trace('Proxy module instantiation')
  }

  getProxy(times, callback) {
    let proxyStatus = false,
      proxy = '';
    if (proxyStatus && proxy) {
      callback(null, proxy);
    } else {
      this.core.proxy.need(times, (err, _proxy) => {
        if (err) {
          if (err === 'timeout!') {
            callback(null, 'timeout');
            return;
          }
          logger.error('Get proxy occur error:', err.message);
          proxyStatus = false;
          this.core.proxy.back(_proxy, false);
          callback(err);
          return;
        }
        callback(null, _proxy);
      });
    }
  }

  need(times, callback) {
    if (times > 5) {
      callback('timeout!');
      return;
    }
    //logger.trace('Send a Require command')
    request(`http://${settings.proxy.host}:${settings.proxy.port}`, (err, res, body) => {
      if (err) {
        logger.debug('err:', err);
        setTimeout(() => {
          this.need(times + 1, callback)
        }, 3000);
        return;
      }
      let proxy;
      try {
        proxy = JSON.parse(body)
      } catch (e) {
        logger.error('Decode response occur error!');
        callback(e.message);
        return;
      }
      if (proxy.proxy) {
        //logger.debug(proxy.proxy)
        callback(null, proxy.proxy);
        return;
      }
      setTimeout(() => {
        // logger.debug('setTImeout')
        this.need(times + 1, callback)
      }, 3000);
    })
  }

  back(proxy, status, callback) {
    request.post(`http://${settings.proxy.host}:${settings.proxy.port}/?proxy=${proxy}&status=${status}`, (err, res, body) => {
      if (err) {
        if (callback) {
          callback(res);
          return;
        }
      }
      if (callback) {
        callback(res);
        return;
      }
    })
  }
}
module.exports = Proxy;