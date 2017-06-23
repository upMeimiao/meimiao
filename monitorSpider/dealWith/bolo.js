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
    logger.trace('bolo monitor begin...');
  }
  start(task, callback) {
    task.timeout = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb();
          });
        },
        list: (cb) => {
          this.getList(task, () => {
            cb();
          });
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task, callback) {
    const option = {
      url: `http://bolo.163.com/new/person?id=${task.id}`
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
        callback();
        return;
      }
      const $ = cheerio.load(result.body),
        fans_num = $('span.item.fans').text();
      if (!fans_num) {
        typeErr = {type: 'data', err: 'bolo-data-fans-null', interface: 'getUser', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    });
  }
  getList(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.bolo.list}&userId=${task.id}&pageNum=1`
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
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result || !result.length) {
        typeErr = {type: 'data', err: 'bolo-data-list-error', interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      this.getVideoInfo(task, result[0].videoId);
      callback();
    });
  }
  getVideoInfo(task, vid) {
    const option = {
      url: `${this.settings.spiderAPI.bolo.videoInfo}${vid}`
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
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVideoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;