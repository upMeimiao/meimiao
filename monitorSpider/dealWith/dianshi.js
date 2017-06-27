/**
 * Created by zhupenghui on 17/6/23.
 */
const async = require( 'neo-async' );
const request = require( 'request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('dianshi monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.timeout = 0;
    this.getList(task, () => {
      callback();
    });
  }
  getList(task, callback) {
    let option = {
      method: 'POST',
      url: 'https://prod2.click-v.com/ds_platform/brand/getBrandDetailOutSide',
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        'Content-Type': 'application/json'
      },
      body: { brandId: task.id, pageSize: 10, pageNum: 1 },
      json: true
    };
    request(option, (err, res, body) => {
      if (err) {
        typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (res.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(res.statusCode), interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!body.data || !body.data.attentionNum) {
        typeErr = {type: 'data', err: 'dianshi-data-fans-error', interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!body.data.list.length) {
        typeErr = {type: 'data', err: 'dianshi-data-list-error', interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; body = null;
      callback();
    });
  }
}
module.exports = dealWith;