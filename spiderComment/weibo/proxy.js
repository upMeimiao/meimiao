const request = require('request');

let logger, settings;
class proxy {
  constructor(_core) {
    this.core = _core;
    settings = _core.settings;
    logger = settings.logger;
    logger.trace('Proxy module instantiation');
  }
  need(times, callback) {
    if (times > 4) {
      callback('timeout');
      return;
    }
    logger.trace('Send a Require command');
    request('http://spider-bidfetcher-intra.meimiaoip.com/proxy/', (err, res, body) => {
      if (err) {
        logger.debug('err:', err);
        setTimeout(() => this.need(times + 1, callback), 5000);
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
        logger.debug('setTimeout');
        return this.need(times + 1, callback);
      }, 5000);
    });
  }
  back(proxy, status, callback) {
    request.post(`http://spider-bidfetcher-intra.meimiaoip.com/proxy/?proxy=${proxy}&status=${status}`, (err, res, body) => {
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
    });
  }
}
module.exports = proxy;