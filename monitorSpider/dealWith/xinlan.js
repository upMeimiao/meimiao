
/**
 * Created by zhupenghui on 17/6/22.
 */

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('xinlan monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.infoCheck = this.modules.infoCheck;
    task.async.parallel(
      {
        list: (cb) => {
          this.getList(task);
          cb();
        },
        video: (cb) => {
          this.getVideoInfo(task);
          cb();
        },
        comment: (cb) => {
          this.getComment(task);
          cb();
        },
        support: (cb) => {
          this.getSupport(task);
          cb();
        },
        sava: (cb) => {
          this.getSava(task);
          cb();
        }
      },
      () => {
        task = null;
        callback();
      }
    );
  }
  getList(task) {
    let option = {
      url: `${this.settings.spiderAPI.xinlan.listVideo + task.id}&cid=${task.encodeId}&_=${new Date().getTime()}`,
      ua: 1
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
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (!result.data || !result.data.length) {
        typeErr = {type: 'data', err: `xinlan-list-error, data: ${JSON.stringify(result)}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; typeErr = null; result = null;
    });
  }
  getVideoInfo(task) {
    let option = {
      url: this.settings.spiderAPI.xinlan.videoInfo + task.aid,
      authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
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
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (!result.content || !result.content.list.length) {
        typeErr = {type: 'data', err: `xinlan-video-data-error, data: ${JSON.stringify(result)}`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; typeErr = null; result = null;
    });
  }
  getComment(task) {
    let option = {
      url: `${this.settings.spiderAPI.xinlan.comment}&xid=${task.aid}&pid=${task.id}&page=1&_${new Date().getTime()}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getComment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getComment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (!result) {
        typeErr = {type: 'json', err: `{error: xinlan-comment-error, data: ${result.body}`, interface: 'getComment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; typeErr = null; result = null;
    });
  }
  getSupport(task) {
    let option = {
      url: `http://proxy.app.cztv.com/getSupportStatus.do?videoIdList=${task.aid}`,
      authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getSupport', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getSupport', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getSupport', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (!result.content) {
        typeErr = {type: 'data', err: `xinlan-support-data-error, data: ${JSON.stringify(result)}`, interface: 'getSupport', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; typeErr = null; result = null;
    });
  }
  getSava(task) {
    let option = {
      url: `http://proxy.app.cztv.com/getCollectStatus.do?videoIdList=${task.aid}`,
      authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getSava', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getSava', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getSava', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (!result.content || ! result.content.list.length) {
        typeErr = {type: 'data', err: `xinlan-sava-data-list, data: ${JSON.stringify(result)}`, interface: 'getSava', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; typeErr = null; result = null;
    });
  }
}
module.exports = dealWith;