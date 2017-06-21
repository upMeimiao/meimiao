/**
 * Created by zhupenghui on 17/6/21.
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
    logger.trace('weibo monitor begin...');
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
        video: (cb) => {
          this.getVideoInfo(task);
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
      url: this.settings.spiderAPI.weibo.userInfo + task.id
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
      if (result.errno && result.errno === 20003) {
        typeErr = {type: 'data', err: `weibo-fans-${result.errno}`, interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.userInfo || !result.userInfo.followers_count) {
        typeErr = {type: 'data', err: 'weibo-fans-data-error', interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.tabsInfo) {
        callback();
        return;
      }
      if (result.tabsInfo.tabs[2].title !== '视频') {
        task.NoVideo = true;
        this.list(task, result);
      } else {
        task.NoVideo = false;
        this.list(task, result);
      }
      callback();
    });
  }
  list(task, data) {
    let containerid = '';
    const option = {};
    if (task.NoVideo) {
      containerid = data.tabsInfo.tabs[1].containerid;
      option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=0`;
    } else {
      containerid = data.tabsInfo.tabs[2].containerid;
      option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_time&page=0`;
    }
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
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if(!result.cards ||  result.cards.length === 0) {
        typeErr = {type: 'data', err: 'weibo-data-null', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getVideoInfo(task) {
    const option = {
      url: `http://api.weibo.cn/2/guest/statuses_show?from=1067293010&c=iphone&s=6dd467f9&id=${task.aid}`
    };
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
        typeErr = {type: 'json', err: JSON.stringify(err.message), interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;