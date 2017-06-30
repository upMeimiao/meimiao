/**
 * Created by zhupenghui on 17/6/20.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('budejie monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.list(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      ua: 1,
      url: this.settings.spiderAPI.budejie.userInfo + task.id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: 'budejie-user-数据异常', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  list(task) {
    let option = {
      url: `${this.settings.spiderAPI.budejie.medialist}${task.id}/1/desc/bs0315-iphone-4.3/0-20.json`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      let data = result.list;
      if(!data) {
        typeErr = {type: 'data', err: 'budejie-data-null', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; data = null;
    });
  }
}
module.exports = dealWith;