/**
 * Created by zhupenghui on 17/7/24.
 */
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('meimiao monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.cheerio = this.modules.cheerio;
    task.infoCheck = this.modules.infoCheck;
    task.async.parallel(
      [
        (cb) => {
          this.getUser(task);
          cb();
        },
        (cb) => {
          this.video(task);
          cb();
        },
        (cb) => {
        this.comment(task);
        cb();
        }
      ],
      () => {
        task = null;
        callback();
      }
    );
  }
  getUser(task){
    let option = {
      url: `${this.settings.spiderAPI.meimiao.list + task.id}&page=1&_=${new Date().getTime()}`,
      ua: 2
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user&&list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user&&list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `user&&list解析失败, data: ${JSON.stringify(result.body)}`, interface: 'user&&list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      if (Number(result.code) !== 0 || !result.data.publisherDetail.imageText.length) {
        typeErr = {type: 'data', err: `error: meimiao-user&&list-data-error, data: ${JSON.stringify(result)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; task = null; result = null;
    });
  }
  video(task) {
    let option = {
      url: `https://m-v.gomeplus.com/v/${task.aid}.html`,
      ua: 2
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
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      let $ = task.cheerio.load(result.body),
        tags = $('div.tag>div.clearfix>a.btn-text').text();
      if (!tags) {
        typeErr = {type: 'data', err: `meimiao-单视频DOM结构出现异常`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; task = null; result = null; $ = null; tags = null;
    });
  }
  comment(task) {
    let option = {
      url: `${this.settings.spiderAPI.meimiao.comment}&topic_id=${task.aid}`,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
      }
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'comment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'comment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `comment解析失败, data: ${JSON.stringify(result.body)}`, interface: 'comment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      if (Number(result.code) !== 200) {
        typeErr = {type: 'data', err: `error: meimiao-comment-data-error, data: ${JSON.stringify(result)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; task = null; result = null;
    });
  }
}
module.exports = dealWith;