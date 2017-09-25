const request = require('request');
const os = require('os');

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
    let api;
    switch (os.hostname()) {
      case 'iZm5e5o52kssf0z0i9vm1hZ':
        api = settings.proxy.newApi1
        break;
      case 'iZ28ilm78mlZ':
        api = settings.proxy.newApi;
        break;
      default:
        api = settings.proxy.newApi1;
    }
    request(api, { gzip: true }, (err, res, body) => {
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
        if (item.includes(',')) {
          itemArr = item.split(',');
          proxy.push(`${itemArr[1].toLowerCase()}://${itemArr[0]}`);
        } else {
          proxy.push(item);
        }
      });
      return callback(null, proxy);
    });
  }
}
module.exports = getProxy;