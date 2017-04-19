const request = require('request');

let logger, settings;
class getProxy {
  constructor(proxy) {
    settings = proxy.settings;
    logger = settings.logger;
    logger.debug('获取代理信息模块实例化...');
  }
  ready(callback) {
    this.get((err, raw) => {
      if (err) {
        return callback(err);
      }
      return callback(null, raw);
    });
  }
  get(callback) {
    const proxy = [];
    request(settings.proxy.newApi, (err, res, body) => {
      if (err) {
        logger.error('Get proxy occur error');
        return callback(err.message);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error('parse proxy-json  error');
        return callback(e.message);
      }
      if (Number(body.code) !== 0) {
        return callback(body.msg);
      }
      let itemArr;
      body.data.proxy_list.forEach((item) => {
        itemArr = item.split(',');
        proxy.push(`${itemArr[1].toLowerCase()}://${itemArr[0]}`);
      });
      return callback(null, proxy);
    });
  }
}
module.exports = getProxy;