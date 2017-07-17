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
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.getVideoList(task);
          cb();
        },
        video: (cb) => {
          this.video(task);
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
      url: `${this.settings.spiderAPI.jd.user + new Date().getTime()}&body={"authorId":"${task.id}"}`,
      ua: 2
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
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result || !result.data) {
        typeErr = {type: 'data', err: `京东视频-用户粉丝出错, data: ${JSON.stringify(result)}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      typeErr = null;
    });
  }
  getVideoList(task) {
    let option = {
      url: `${this.settings.spiderAPI.jd.list + new Date().getTime()}&body={"authorId":"${task.id}","page":1,"pagesize":20,"type":1}`,
      ua: 2
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
      if (!result.page || !result.page.content.length) {
        typeErr = {type: 'data', err: `京东视频-视频列表数据出错, data: ${JSON.stringify(result)}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      typeErr = null;
    });
  }
  video(task) {
    let option = {
      url: `${this.settings.spiderAPI.jd.video + new Date().getTime()}&body={"id":"${task.aid}"}`,
      ua: 2
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
      if (!result.data) {
        typeErr = {type: 'data', err: `jd-视频详情接口, data: ${JSON.stringify(result)}`, interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      typeErr = null;
    });
  }
}
module.exports = dealWith;