/**
 * Created by zhupenghui on 17/6/23.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('huoshan monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.timeout = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.getList(task);
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
      url: `${this.settings.spiderAPI.huoshan.user}${task.id}`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getUser', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getUser', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      result = result.body.replace(/[\n\s\r]/g, '');
      if (!result.match(/"stats":{"follower_count":(\d*)/)) {
        typeErr = {type: 'data', err: 'huoshan-data-fans-正则匹配失败', interface: 'getUser', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      let fans = result.match(/"stats":{"follower_count":(\d*)/)[1];
      if (!fans) {
        typeErr = {type: 'data', err: 'huoshan-data-fans-null', interface: 'getUser', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; fans = null;
    });
  }
  getList(task) {
    let option = {
      url: `${this.settings.spiderAPI.huoshan.list}offset=0&count=21&user_id=${task.id}&max_time=0`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data.items || !result.data.items.length) {
        typeErr = {type: 'data', err: 'huoshan-data-list-error', interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      this.getVideoInfo(task, result.data.items[0].id);
      option = null; result = null;
    });
  }
  getVideoInfo(task, vid) {
    let option = {
      url: `${this.settings.spiderAPI.huoshan.video}${vid}`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      const startIndex = result.indexOf('vardata='),
        endIndex = result.indexOf(";require('pagelet/reflow_video/detail/detail')");
      if (startIndex === -1 || endIndex === -1) {
        typeErr = {type: 'data', err: 'huoshan-video-dom-error', interface: 'getVideoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      result = result.substring(startIndex + 8, endIndex);
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVideoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
}
module.exports = dealWith;