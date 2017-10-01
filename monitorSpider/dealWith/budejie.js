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
    logger.trace('budejie monitor begin...');
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
      url: this.settings.spiderAPI.budejie.userInfo + task.id
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
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      if (!result.data || !result.data.fans_count) {
        typeErr = {type: 'data', err: `budejie-user-数据异常, data: ${JSON.stringify(result)}`, interface: 'user', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
  list(task) {
    let option = {
      url: `${this.settings.spiderAPI.budejie.medialist}${task.id}/1/desc/bs0315-iphone-4.3/0-20.json`
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
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      if(!result.list || !result.list[0].video) {
        typeErr = {type: 'data', err: `budejie-data-null, data: ${JSON.stringify(result)}`, interface: 'list', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
  getComment(task) {
    let option = {
      url: `${this.settings.spiderAPI.budejie.comment + task.aid}&page=1`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getComment', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getComment', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      if (result == '' || result.total === 0) {
        typeErr = {type: 'data', err: `budejie-comment-data-null, data: ${JSON.stringify(result)}`, interface: 'getComment', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
}
module.exports = dealWith;