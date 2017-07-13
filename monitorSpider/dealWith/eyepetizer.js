/**
 * Created by zhupenghui on 17/7/12.
 */
let logger, typeErr, request, infoCheck, async;

class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    async = core.modules.async;
    logger = this.settings.logger;
    logger.trace('naitang monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
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
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        option = null;
        typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.itemList || !result.itemList.length) {
        typeErr = {type: 'data', err: '开眼视频-视频列表数据出错', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      option = null;
      typeErr = null;
    });
  }
  video(task) {
    let option = {
      url: this.settings.spiderAPI.kaiyan.video + task.aid,
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
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
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result) {
        typeErr = {type: 'data', err: 'kaiyan-视频详情接口', interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      typeErr = null;
    });
  }
  comment(task) {
    let option = {
      url: `${this.settings.spiderAPI.aipai.comment + task.aid}.html`,
      ua: 2
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
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'comment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.total === undefined) {
        typeErr = {type: 'data', err: 'kaiyan-评论', interface: 'comment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      typeErr = null;
    });
  }
}
module.exports = dealWith;