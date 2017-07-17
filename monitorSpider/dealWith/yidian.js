/**
 * Created by zhupenghui on 17/6/20.
 */

let logger, typeErr, async, request, infoCheck;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    async = core.modules.async;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    logger = this.settings.logger;
    logger.trace('yidian monitor begin...');
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
        total: (cb) => {
          this.getVideos(task);
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
      url: this.settings.spiderAPI.yidian.userInfo + task.id,
      ua: 3,
      own_ua: 'yidian/4.3.4.4 (iPhone; iOS 10.1.1; Scale/3.00)'
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
      if (!result.result || !result.result.channels) {
        typeErr = {type: 'data', err: `yidian-user-data-error, data: ${JSON.stringify(result)}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getVideos(task) {
    let option = {
      url: `${this.settings.spiderAPI.yidian.list}&path=channel|news-list-for-channel&channel_id=${task.id}&cstart=0&cend=10`,
      referer: `http://www.yidianzixun.com/home?page=channel&id=${task.id}`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideos', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideos', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideos', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.status !== 'success' || !result.result.length) {
        typeErr = {type: 'data', err: `yidian-videos-data-error, data: ${JSON.stringify(result)}`, interface: 'getVideos', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.result[0].ctype === 'interest_navigation') {
        if (!result.result[0].columns || result.result[0].columns.length < 2) {
          typeErr = {type: 'data', err: `yidian-videos-data-error, data: ${JSON.stringify(result)}`, interface: 'getVideos', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          return;
        }
        task.interest_id = result.result[0].columns[1].interest_id;
        this.getList(task, 'video');
      } else {
        this.getList(task, 'all');
      }
      option = null; result = null;
    });
  }
  getList(task, type) {
    let option = {
        ua: 1
      }, cstart = 0, cend = 50;
    if (type === 'video') {
      option.url = `${this.settings.spiderAPI.yidian.list}&path=channel|news-list-for-vertical&interest_id=${task.interest_id}&channel_id=${task.id}&cstart=${cstart}&cend=${cend}`;
    } else {
      option.url = `${this.settings.spiderAPI.yidian.list}&path=channel|news-list-for-channel&channel_id=${task.id}&cstart=${cstart}&cend=${cend}`;
    }
    option.referer = `http://www.yidianzixun.com/home?page=channel&id=${task.id}`;
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getList', url: option.url};
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
      if (!result.result || result.result.length === 0 || Number(result.code) !== 0) {
        typeErr = {type: 'data', err: `一点资讯列表数据-null, data: ${JSON.stringify(result)}`, interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      option = null; result = null; cstart = null; cend = null;
    });
  }
}
module.exports = dealWith;