
/**
 * Created by zhupenghui on 17/6/22.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const URL = require('url');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('cctv monitor begin...');
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
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      url: `${this.settings.spiderAPI.cctv.fans + task.id}&_=${new Date().getTime()}`
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
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: 'cctv-fans-数据异常', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getList(task) {
    let option = {
      url: `http://my.xiyou.cntv.cn/${task.id}/video-1-1.html`,
      ua: 1
    }, $, content;
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
      $ = cheerio.load(result.body);
      content = $('div.shipin_list_boxs>ul>li');
      if (content.length === 0) {
        typeErr = {type: 'data', err: 'cctv-list-data-null', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      this.getVidInfo(task, content.eq(0));
      option = null; result = null; $ = null; content = null;
    });
  }
  getVidInfo(task, video) {
    let vid = video.find('div.images>a').attr('href'),
      option = {};
    vid = URL.parse(vid, true).pathname;
    vid = vid.replace('/v-', '').replace('.html', '');
    option.url = this.settings.spiderAPI.cctv.videoInfo + vid;
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'video', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'video', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: 'cctv-videoInfo-数据异常', interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; vid = null;
    });
  }
}
module.exports = dealWith;