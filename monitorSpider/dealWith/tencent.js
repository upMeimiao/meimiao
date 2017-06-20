/**
 * Created by zhupenghui on 17/6/15.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const jsonp = (data) => {
  return data
};
let logger, api, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    api = this.settings.spiderAPI;
    logger.trace('tencent monitor begin...');
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb();
          })
        },
        list: (cb) => {
          this.getTotal(task, () => {
            cb();
          });
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
  getUser(task, callback) {
    const options = {
      url: `${this.settings.spiderAPI.tencent.user + task.id}&_=${new Date().getTime()}`
    };
    request.get(logger, options, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      const fans = result.followcount.indexOf('万') === -1 ? result.followcount : Number(result.followcount.replace(/万/g, '')) * 10000;
      if (!fans) {
        typeErr = {type: 'data', err: 'tencent-user-fansData-error', interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    })
  }
  getTotal(task, callback) {
    logger.debug('开始获取视频总数');
    const option = {
      url: `${this.settings.spiderAPI.tencent.videoList + task.id}&pagenum=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'total', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'total', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.stringify(result.body.substring(6, result.body.length - 1)).replace(/[\s\n\r\\]/g, '');
        result = JSON.parse(result.substring(1, result.length - 1));
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'total', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (result.s !== 'o') {
        logger.error(`异常错误${result.em}`);
        typeErr = {type: 'data', err: JSON.stringify(`异常错误${result.em}`), interface: 'total', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.vtotal && result.vtotal !== 0) {
        logger.error('异常错误');
        typeErr = {type: 'data', err: JSON.stringify('异常错误 result.vtotal !== 0'), interface: 'total', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
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
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getView', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getView', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      const backData = eval(result.body),
        back = backData.results;
      if (!back) {
        typeErr = {type: 'data', err: '数据为空', interface: 'getView', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getComment(task) {
    const option = {
      url: this.settings.spiderAPI.tencent.commentId + task.aid
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getComment', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      let backData;
      try {
        backData = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getComment', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!backData.result) {
        typeErr = {type: 'data', err: 'data-null', interface: 'getComment', url: options.url};
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
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getCommentNum', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getCommentNum', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getCommentNum', url: options.url};
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
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidTag', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidTag', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVidTag', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.v || result.v.length === 0) {
        typeErr = {type: 'data', err: 'data-null', interface: 'getVidTag', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;