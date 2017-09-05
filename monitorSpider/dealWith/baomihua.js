/**
 * Created by zhupenghui on 17/6/20.
 */
const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('baomihua monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.infoCheck = this.modules.infoCheck;
    task.core = this.core;
    task.async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        total: (cb) => {
          this.getTotal(task);
          cb();
        },
        expr: (cb) => {
          this.getExpr(task);
          cb();
        },
        ExprPC: (cb) => {
          this.getExprPC(task);
          cb();
        },
        play: (cb) => {
          this.getPlayNum(task);
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
      url: this.settings.spiderAPI.baomihua.userInfo + task.id
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
      if (!result || !result.result || !result.result.ChannelInfo || !result.result.ChannelInfo.RssNum) {
        typeErr = {type: 'json', err: `baomihua-用户信息异常, data: ${JSON.stringify(result)}`, interface: 'user', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  getTotal(task) {
    let option = {
      url: this.settings.spiderAPI.baomihua.mediaList + task.id,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getTotal', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getTotal', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getTotal', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; typeErr = null; task = null;
        return
      }
      if (!result.result || !result.result.VideoList) {
        typeErr = {type: 'json', err: `baomihua-视频列表数据异常, data: ${JSON.stringify(result.result)}`, interface: 'getTotal', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
  getExpr(task) {
    let option = {
      url: this.settings.spiderAPI.baomihua.expr_m + task.aid,
      ua: 3,
      own_ua: 'BMHVideo/3.3.3 (iPhone; iOS 10.1.1; Scale/3.00)'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExpr', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExpr', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getExpr', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      if (!result || !result.result) {
        typeErr = {type: 'data', err: `baomihua-Expr-data-数据异常, ${JSON.stringify(result)}`, interface: 'getExpr', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
  getExprPC(task) {
    let option = {
      url: `${this.settings.spiderAPI.baomihua.expr_pc + task.aid}&_=${(new Date()).getTime()}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExprPC', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExprPC', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getExprPC', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (result.length === 0) {
        typeErr = {type: 'data', err: `baomihua-getExprPC-data-数据异常, data: ${JSON.stringify(result)}`, interface: 'getExprPC', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
  getPlayNum(task) {
    let option = {
      url: `${this.settings.spiderAPI.baomihua.play}${task.id}&flvid=${task.aid}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getPlayNum', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getPlayNum', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getPlayNum', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.appinfo[0]) {
        typeErr = {type: 'data', err: `baomihua-playnum-数据异常, data: ${JSON.stringify(result)}`, interface: 'getPlayNum', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
}
module.exports = dealWith;