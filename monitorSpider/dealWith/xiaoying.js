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
    logger.trace('xiaoying monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.infoCheck = this.modules.infoCheck;
    task.h = this.core.h;
    task.async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.list(task);
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
      ua: 1,
      url: `${this.settings.spiderAPI.xiaoying.userInfo + task.id}&_=${new Date().getTime()}`
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
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result.user) {
        typeErr = {type: 'data', err: `xiaoying-user-data-error, data: ${JSON.stringify(result)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; result = null; typeErr = null;
    });
  }
  list(task) {
    let option = {
      url: `${this.settings.spiderAPI.xiaoying.list + task.id}&pageindex=1&_=${new Date().getTime()}`
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
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result.videolist) {
        typeErr = {type: 'data', err: `xiaoying-list-data-error, data: ${JSON.stringify(result)}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      this.getComment(task, result.videolist[1].puid);
      option = null; task = null; result = null; typeErr = null;
    });
  }
  getComment(task, aid) {
    let option = {
      url: this.settings.spiderAPI.xiaoying.comment,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'XiaoYing/5.5.6 (iPhone; iOS 10.2.1; Scale/3.00)'
      },
      data: {
        a: 'pa',
        b: '1.0',
        c: '20008400',
        e: 'DIqmr4fb',
        h: task.h,
        i: `{"d":20,"b":"1","c":1,"a":"${aid}"}`,
        j: 'ae788dbe17e25d0cff743af7c3225567',
        k: 'xysdkios20130711'
      }
    };
    task.request.post(logger, option, (error, result) => {
      if (error) {
        if (error.status && error.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(error.status), interface: 'getComment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(error.message), interface: 'getComment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getComment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result || !result.total) {
        typeErr = {type: 'data', err: `{error: 评论数据异常, data: ${result.body}`, interface: 'getComment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; result = null; typeErr = null;
    });
  }
}
module.exports = dealWith;