/**
 * Created by zhupenghui on 17/6/15.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const jsonp = (data) => {
  return data
};
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('tencent monitor begin...');
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
        },
        list: (cb) => {
          this.getTotal(task);
        },
        view: (cb) => {
          this.getView(task);
          cb();
        },
        comment: (cb) => {
          this.getComment(task);
          cb();
        },
        tag: (cb) => {
          this.getVidTag(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task) {
    const option = {
      url: `${this.settings.spiderAPI.tencent.user + task.id}&_=${new Date().getTime()}`
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
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      const fans = result.followcount.indexOf('万') === -1 ? result.followcount : Number(result.followcount.replace(/万/g, '')) * 10000;
      if (!fans) {
        typeErr = {type: 'data', err: 'tencent-user-fansData-error', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getTotal(task) {
    const option = {
      url: `${this.settings.spiderAPI.tencent.videoList + task.id}&pagenum=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'total', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'total', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.stringify(result.body.substring(6, result.body.length - 1)).replace(/[\s\n\r\\]/g, '');
        result = JSON.parse(result.substring(1, result.length - 1));
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'total', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.s !== 'o') {
        typeErr = {type: 'data', err: JSON.stringify(`异常错误${result.em}`), interface: 'total', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.vtotal && result.vtotal !== 0) {
        typeErr = {type: 'data', err: JSON.stringify('异常错误 result.vtotal !== 0'), interface: 'total', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
    });
  }
  getView(task) {
    const option = {
      url: this.settings.spiderAPI.tencent.view + task.aid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getView', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getView', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      const backData = eval(result.body),
        back = backData.results;
      if (!back) {
        typeErr = {type: 'data', err: '数据为空', interface: 'getView', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getComment(task) {
    const option = {
      url: this.settings.spiderAPI.tencent.commentId + task.aid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      let backData;
      try {
        backData = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!backData.result) {
        typeErr = {type: 'data', err: 'data-null', interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (backData.result.code == 0) {
        this.getCommentNum(task, backData.comment_id);
      }
    });
  }
  getCommentNum(task) {
    const option = {
      url: `${this.settings.spiderAPI.tencent.commentNum + task.aid}/commentnum?_=${new Date().getTime()}`,
      referer: 'https://v.qq.com/txyp/coralComment_yp_1.0.htm',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getCommentNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getCommentNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getCommentNum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getVidTag(task) {
    const option = {
      url: `http://c.v.qq.com/videoinfo?otype=json&callback=jsonp&low_login=1&vid=${task.aid}&fields=recommend%7Cedit%7Cdesc%7Cnick%7Cplaycount`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidTag', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidTag', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVidTag', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.v || result.v.length === 0) {
        typeErr = {type: 'data', err: 'data-null', interface: 'getVidTag', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;