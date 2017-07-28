/**
 * Created by zhupenghui on 17/6/23.
 */

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('bolo monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.timeout = 0;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.cheerio = this.modules.cheerio;
    task.infoCheck = this.modules.infoCheck;
    task.core = this.core;
    task.async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.getList(task);
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
      url: `http://bolo.163.com/new/person?id=${task.id}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getUser', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getUser', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      let $ = task.cheerio.load(result.body),
        fans_num = $('span.item.fans').text();
      if (!fans_num) {
        typeErr = {type: 'data', err: `bolo-data-fans-null, data: ${fans_num}`, interface: 'getUser', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; $ = null; fans_num = null; task = null; typeErr = null;
    });
  }
  getList(task) {
    let option = {
      url: `${this.settings.spiderAPI.bolo.list}&userId=${task.id}&pageNum=1`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getList', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getList', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getList', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result || !result.length) {
        typeErr = {type: 'data', err: `bolo-data-list-error, data: ${JSON.stringify(result)}`, interface: 'getList', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      this.getVideoInfo(task, result[0].videoId);
      option = null; result = null; typeErr = null; task = null;
    });
  }
  getVideoInfo(task, vid) {
    let option = {
      url: `${this.settings.spiderAPI.bolo.videoInfo}${vid}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoInfo', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoInfo', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideoInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (!result.videoInfo) {
        typeErr = {type: 'data', err: `bolo-videoInfo-数据异常, data: ${JSON.stringify(result)}`, interface: 'getVideoInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; result = null; task = null;
    });
  }
}
module.exports = dealWith;