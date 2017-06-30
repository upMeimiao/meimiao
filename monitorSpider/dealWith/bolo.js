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
        return;
      }
      let $ = cheerio.load(result.body),
        fans_num = $('span.item.fans').text();
      if (!fans_num) {
        typeErr = {type: 'data', err: 'bolo-data-fans-null', interface: 'getUser', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; $ = null; fans_num = null;
    });
  }
  getList(task) {
    let option = {
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
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result || !result.length) {
        typeErr = {type: 'data', err: 'bolo-data-list-error', interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      this.getVideoInfo(task, result[0].videoId);
      option = null; result = null;
    });
  }
  getVideoInfo(task, vid) {
    let option = {
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
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.videoInfo) {
        typeErr = {type: 'data', err: 'bolo-videoInfo-数据异常', interface: 'getVideoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
}
module.exports = dealWith;