/**
 * Created by zhupenghui on 17/6/20.
 */

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('btime monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.infoCheck = this.modules.infoCheck;
    task.async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.list(task);
          cb();
        },
        info: (cb) => {
          this.getInfo(task);
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
      url:  this.settings.spiderAPI.btime.userInfo + task.id
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (!result.data || !result.data.fans) {
        typeErr = {type: 'data', err: `btime-fans-数据异常, data: ${JSON.stringify(result)}`, interface: 'user', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; task = null; result = null;
    });
  }
  list(task) {
    let option = {
      url: `${this.settings.spiderAPI.btime.medialist + task.id}&pageNo=1&lastTime=`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (!result || !result.data.length) {
        typeErr = {type: 'data', err: `btime-list-数据异常, data: ${JSON.stringify(result)}`, interface: 'list', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
  getInfo(task) {
    let option = {
      url: `${this.settings.spiderAPI.btime.info + task.aid}&timestamp=${Math.round(new Date().getTime() / 1000)}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getInfo', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getInfo', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (Number(result.errno) !== 0 || !result.data || !result.data.watches) {
        typeErr = {type: 'data', err: `btime-videoInfo-数据异常, data: ${JSON.stringify(result)}`, interface: 'getInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
  getComment(task) {
    let option = {
      url: `http://api.app.btime.com/api/commentList?protocol=1&timestamp=${Math.round(new Date().getTime() / 1000)}&url=http%253A%252F%252Frecord.btime.com%252Fnews%253Fid%253D${task.aid}&ver=2.3.0`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getInfo', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getInfo', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      if (Number(result.errno) !== 0) {
        typeErr = {type: 'data', err: `btime-comment-数据异常, data: ${JSON.stringify(result)}`, interface: 'getInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
}
module.exports = dealWith;