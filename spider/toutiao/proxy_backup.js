const request = require('request');

let logger, settings;
class proxyClient {
  constructor(_core) {
    this.core = _core;
    settings = _core.settings;
    logger = settings.logger;
    logger.trace('Proxy module instantiation');
  }
  need(times) {
    return new Promise((resolve, reject) => {
      if (times > 4) {
        reject('timeout!');
        return;
      }
      // logger.trace('Send a Require command');
      request(`http://${settings.proxy.host}:${settings.proxy.port}`, (err, res, body) => {
        if (err) {
          // logger.debug('err:', err);
          setTimeout(() => this.need(times + 1), 3000);
          return;
        }
        let proxy;
        try {
          proxy = JSON.parse(body);
        } catch (e) {
          logger.error('Decode response occur error!');
          reject(e.message);
          return;
        }
        if (proxy.proxy) {
          // logger.debug(proxy.proxy);
          resolve(proxy.proxy);
          return;
        }
        setTimeout(() => {
          this.need(times + 1);
        }, 3000);
      });
    });
  }
  back(proxy, status, callback) {
    request.post(`http://${settings.proxy.host}:${settings.proxy.port}/?proxy=${proxy}&status=${status}`, (err, res) => {
      if (err) {
        if (callback) {
          callback(err);
          return;
        }
      }
      if (callback) {
        callback(res);
      }
    });
  }
}
module.exports = proxyClient;