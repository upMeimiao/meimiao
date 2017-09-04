/**
 * Created by zhupenghui on 17/6/19.
 */

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('miaopai monitor begin...');
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
        media: (cb) => {
          this.getInfo(task, task.aid);
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
      url: `${this.settings.spiderAPI.miaopai.api}1&per=20&suid=${task.id}`
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
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.header || !result.header.eventCnt) {
        typeErr = {type: 'data', err: 'miaopai-fans-data-error', interface: 'user', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  list(task) {
    let option = {
      url: `${this.settings.spiderAPI.miaopai.api}&per=20&suid=${task.id}`
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
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.result || result.result.length === 0) {
        typeErr = {type: 'data', err: 'miaopai-list-data-null', interface: 'list', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  getInfo(task, id) {
    let option = {
      url: `http://api.miaopai.com/m/v2_channel.json?fillType=259&scid=${id}&vend=miaopai`
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
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'error', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (Number(result.status) !== 200) {
        typeErr = {type: 'status', err: `miaopai-videoInfo-data-status-${JSON.stringify(result.status)}`, interface: 'getInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
}
module.exports = dealWith;