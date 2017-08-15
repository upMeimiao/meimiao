/**
 * Created by zhupenghui on 17/7/12.
 */
let logger, typeErr, request, infoCheck, async;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    // request = core.modules.request;
    // infoCheck = core.modules.infoCheck;
    // async = core.modules.async;
    logger = this.settings.logger;
    logger.trace('eyepetizer monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.async = this.modules.async;
    task.async.parallel(
      {
        list: (cb) => {
          this.getVideoList(task);
          cb();
        },
        video: (cb) => {
          this.video(task);
          cb();
        },
        comment: (cb) => {
          this.comment(task);
          cb();
        }
      },
      () => {
        task = null;
        callback();
      }
    );
  }
  getVideoList(task) {
    let option = {
      url: `${this.settings.spiderAPI.kaiyan.list + task.id}&start=0&num=50`,
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (!result.itemList || !result.itemList.length) {
        typeErr = {type: 'data', err: `开眼视频-视频列表数据出错, data: ${JSON.stringify(result)}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        return;
      }
      option = null; typeErr = null; task = null; result = null;
    });
  }
  video(task) {
    let option = {
      url: this.settings.spiderAPI.kaiyan.video + task.aid,
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
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
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      if (!result) {
        typeErr = {type: 'data', err: `kaiyan-视频详情接口, data: ${JSON.stringify(result)}`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; task = null; result = null;
    });
  }
  comment(task) {
    let option = {
      url: `${this.settings.spiderAPI.kaiyan.comment + task.aid}&num=50&lastId=`,
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'comment', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'comment', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'comment', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      if (!result.total) {
        typeErr = {type: 'data', err: `kaiyan-评论, data: ${JSON.stringify(result)}`, interface: 'comment', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; task = null; result = null;
    });
  }
}
module.exports = dealWith;