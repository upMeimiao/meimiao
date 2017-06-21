/**
 * Created by zhupenghui on 17/6/21.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const fetchUrl = require('fetch').fetchUrl;
const infoCheck = require('../controllers/infoCheck');

const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('tv56 monitor begin...');
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
          this.list(task);
          cb();
        },
        video: (cb) => {
          this.getVideo(task);
          cb();
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
      url: `${this.settings.spiderAPI.tv56.userInfo}?uids=${task.id}&_=${new Date().getTime()}`,
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
        callback();
        return;
      }
      const userInfo = result.data;
      if (userInfo.length === 0) {
        typeErr = {type: 'data', err: 'tv56-dans-data-error', interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    })
  }
  list(task) {
    const option = {
      url: `${this.settings.spiderAPI.tv56.list}${task.id}&_=${new Date().getTime()}&pg=1`,
      ua: 1
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
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if(!result.data.list ||  result.data.list.length === 0) {
        typeErr = {type: 'data', err: 'tv56-data-null', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getVideo(task) {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
      }
    };
    fetchUrl(`${this.settings.spiderAPI.tv56.video}${task.aid}&_=${new Date().getTime()}`, options, (err, meta, body) => {
      if (err) {
        typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'video', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (meta.status !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(meta.status), interface: 'video', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'video', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (body.status !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(body.status), interface: 'video', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!body.data.video_desc) {
        typeErr = {type: 'data', err: 'tv56-video-data-error', interface: 'video', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getComment(task) {
    const option = {
      url: `${this.settings.spiderAPI.tv56.comment}${task.aid}&_=${new Date().getTime()}`,
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'comment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'comment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'comment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;