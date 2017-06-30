/**
 * Created by zhupenghui on 17/6/21.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const videoList = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('wangyi monitor begin...');
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
          this.getList(task);
          cb();
        },
        play: (cb) => {
          this.getPlay(task);
          cb();
        },
        vidInfo: (cb) => {
          this.getVidInfo(task);
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
      url: `${this.settings.spiderAPI.wangyi.userInfo + task.id}.html`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user-total', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user-total', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user-total', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.topicSet) {
        typeErr = {type: 'data', err: 'wangyi-user-data-error', interface: 'user-total', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getList(task, video) {
    let option = {
      url: `${this.settings.spiderAPI.wangyi.videoInfo + task.id}/video/0-20.html`,
      ua: 2
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
      if (!result || result.length === 0) {
        typeErr = {type: 'data', err: 'wangyi-data-null', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getVidInfo(task) {
    let option = {
      url: `http://3g.163.com/touch/video/detail/jsonp/${task.aid}.html?callback=videoList`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result) {
        typeErr = {type: 'data', err: 'wangyi-data-null', interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getPlay(task) {
    let option = {
      url: `http://so.v.163.com/vote/${task.aid}.js`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getPlay', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getPlay', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = result.body.replace('var vote = ', '').replace(';', '');
        result = JSON.parse(result);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result}`, interface: 'getPlay', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.info) {
        typeErr = {type: 'data', err: 'wangyi-play-data-error', interface: 'getPlay', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
}
module.exports = dealWith;