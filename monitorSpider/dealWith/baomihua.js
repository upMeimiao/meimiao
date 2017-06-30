/**
 * Created by zhupenghui on 17/6/20.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');
const crypto = require('crypto');

const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('baomihua monitor begin...');
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
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      url: this.settings.spiderAPI.baomihua.userInfo + task.id
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
      if (!result) {
        typeErr = {type: 'json', err: 'baomihua-用户信息异常', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      typeErr = null; option = null; result = null;
    });
  }
  getTotal(task) {
    let option = {
      url: this.settings.spiderAPI.baomihua.mediaList + task.id,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getTotal', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getTotal', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getTotal', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return
      }
      if (!result.result || !result.result.VideoList) {
        typeErr = {type: 'json', err: 'baomihua-视频列表数据异常', interface: 'getTotal', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; typeErr = null; result = null;
    });
  }
  getExpr(task) {
    let option = {
      url: this.settings.spiderAPI.baomihua.expr_m + task.aid,
      ua: 3,
      own_ua: 'BMHVideo/3.3.3 (iPhone; iOS 10.1.1; Scale/3.00)'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExpr', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExpr', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getExpr', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result || !result.result) {
        typeErr = {type: 'data', err: 'baomihua-Expr-data-数据异常', interface: 'getExpr', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; typeErr = null;
    });
  }
  getExprPC(task) {
    let option = {
      url: `${this.settings.spiderAPI.baomihua.expr_pc + task.aid}&_=${(new Date()).getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExprPC', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExprPC', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getExprPC', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.length === 0) {
        typeErr = {type: 'data', err: 'baomihua-getExprPC-data-数据异常', interface: 'getExprPC', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; typeErr = null;
    });
  }
  getPlayNum(task) {
    let option = {
      url: `${this.settings.spiderAPI.baomihua.play}${task.id}&flvid=${task.aid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getPlayNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getPlayNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getPlayNum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.appinfo[0]) {
        typeErr = {type: 'data', err: 'baomihua-playnum-数据异常', interface: 'getPlayNum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
}
module.exports = dealWith;