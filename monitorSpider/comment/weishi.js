/**
 * Created by zhupenghui on 17/8/1.
 */
const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('weishi comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.cheerio = this.modules.cheerio;
    this.commentId(task, () => callback());
  }
  commentId(task, callback) {
    let option = {
      url: this.settings.weishi.vidHtml + task.aid
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'commentId', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'commentId', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      let $ = task.cheerio.load(result.body),
        pagetime = $('ul[class="pt10"]>li');
      if (pagetime.length) {
        typeErr = {type: 'error', err: `微视评论源码异常`, interface: 'commentId', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      this.getTotal(task, pagetime);
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
  getTotal(task) {
    let option = {
      url: `${this.settings.weishi.list2}&id=${task.aid}&pageflag=0&pagetime=0&lastid=0`,
      referer: 'http://wsi.qq.com',
      ua: 3,
      own_ua: 'Weishi/3.0.2 (iPhone; iPhone; iPhone OS 10.2.1; zh_CN)'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getTotal', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getTotal', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'getTotal', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (!result || !result.data) {
        typeErr = {type: 'json', err: `{error: 评论总数数据异常, data: ${JSON.stringify(result)}}`, interface: 'getTotal', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
    });
  };
}
module.exports = dealWith;