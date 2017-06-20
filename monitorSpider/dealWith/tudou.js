/**
 * Created by zhupenghui on 17/6/20.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');
const crypto = require('crypto');

const sign = (t, e) => {
  const md5 = crypto.createHash('md5');
  if (t === 'v') {
    return md5.update(`100-DDwODVkv&6c4aa6af6560efff5df3c16c704b49f1&${e}`).digest('hex');
  }
  return md5.update(`700-cJpvjG4g&bad4543751cacf3322ab683576474e31&${e}`).digest('hex');
};
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('tudou monitor begin...');
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb();
          })
        },
        total: (cb) => {
          this.getTotal(task, () => {
            cb();
          });
        },
        comment: (cb) => {
          this.getComment(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task, callback) {
    const options = {
      url: `${this.settings.spiderAPI.tudou.fans}${task.encodeId}&_=${new Date().getTime()}`,
      ua: 1
    };
    request.get(logger, options, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    })
  }
  getTotal(task, callback) {
    const time = new Date().getTime().toString().substring(0, 10),
      option = {
      url: `${this.settings.spiderAPI.tudou.newList}&pg=1&uid=${task.encodeId}&_s_=${sign('v', time)}&_t_=${time}&e=md5`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getTotal', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getTotal', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getTotal', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    });
  }
  getComment(task) {
    const time = new Date().getTime().toString().substring(0, 10),
      option = {
        url: `${this.settings.spiderAPI.tudou.comment}${task.aid}&objectType=1&listType=0&currentPage=1&pageSize=30&sign=${sign('c', time)}&time=${time}`,
        ua: 1
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;