/**
 * Created by zhupenghui on 17/6/20.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('souhu monitor begin...');
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
        list: (cb) => {
          this.list(task, () => {
            cb();
          });
        },
        media: (cb) => {
          this.getInfo(task);
          cb();
        },
        getDigg: (cb) => {
          this.getDigg(task);
          cb();
        },
        comment: (cb) => {
          this.getCommentNum(task);
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
      url: `${this.settings.spiderAPI.souhu.newUser + task.id}.json?api_key=${this.settings.spiderAPI.souhu.key}&_=${(new Date()).getTime()}`
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
  list(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.souhu.newList + task.id}&page=1&_=${new Date().getTime()}`
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
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.data || result.data.videos.length === 0) {
        typeErr = {type: 'data', err: 'bili-list-data-null', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    });
  }
  getInfo(task) {
    const option = {
      url: `${this.settings.spiderAPI.souhu.videoInfo + task.aid}.json?site=2&api_key=695fe827ffeb7d74260a813025970bd5&aid=0`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'error', err: JSON.stringify(e.message), interface: 'getInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (Number(result.status) !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(result.status), interface: 'getInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getDigg(task) {
    const option = {
      url: `${this.settings.spiderAPI.souhu.digg + task.aid}&_=${(new Date()).getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getDigg', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getDigg', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'error', err: JSON.stringify(e.message), interface: 'getInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getCommentNum(task) {
    const option = {
      url: this.settings.spiderAPI.souhu.comment + task.aid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getCommentNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getCommentNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'error', err: JSON.stringify(e.message), interface: 'getCommentNum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;