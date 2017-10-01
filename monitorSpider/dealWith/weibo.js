/**
 * Created by zhupenghui on 17/6/21.
 */

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('weibo monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.async = this.modules.async;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        video: (cb) => {
          this.getVideoInfo(task);
          cb();
        }
      },
      () => {
        task = null;
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      url: this.settings.spiderAPI.weibo.userInfo + task.id,
      ua: 3,
      own_ua: 'Weibo/5598 CFNetwork/811.5.4 Darwin/16.6.0' // ,
      // proxy: 'http://127.0.0.1:56777'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (result.errno && result.errno === 20003) {
        typeErr = {type: 'data', err: `weibo-fans-${result.errno}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.userInfo || !result.userInfo.followers_count) {
        typeErr = {type: 'data', err: `weibo-fans-data-error, data: ${JSON.stringify(result)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.tabsInfo) {
        return;
      }
      if (result.tabsInfo.tabs[2].title !== '视频') {
        task.NoVideo = true;
        this.list(task, result);
      } else {
        task.NoVideo = false;
        this.list(task, result);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  list(task, data) {
    let containerid = '',
      option = {
        ua: 3,
        own_ua: 'Weibo/5598 CFNetwork/811.5.4 Darwin/16.6.0' // ,
        // proxy: 'http://127.0.0.1:56777'
      };
    if (task.NoVideo) {
      containerid = data.tabsInfo.tabs[1].containerid;
      option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=0`;
    } else {
      containerid = data.tabsInfo.tabs[2].containerid;
      option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_time&page=0`;
    }
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if(!result.cards ||  result.cards.length === 0) {
        typeErr = {type: 'data', err: `weibo-data-null, data: ${JSON.stringify(result)}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; data = null; task = null; typeErr = null;
    });
  }
  getVideoInfo(task) {
    let option = {
      url: `http://api.weibo.cn/2/guest/statuses_show?from=1067293010&c=iphone&s=6dd467f9&id=${task.aid}`,
      ua: 3,
      own_ua: 'Weibo/5598 CFNetwork/811.5.4 Darwin/16.6.0' // ,
      // proxy: 'http://127.0.0.1:56777'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'video', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'video', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.page_info) {
        typeErr = {type: 'data', err: `weibo-video-data-error, data: ${JSON.stringify(result)}`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.page_info.media_info) {
        typeErr = {type: 'data', err: `weibo-video-data-error, data: ${JSON.stringify(result)}`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
}
module.exports = dealWith;