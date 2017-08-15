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
    logger.trace('huoshan monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.infoCheck = this.modules.infoCheck;
    task.cheerio = this.modules.cheerio;
    task.async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.getList(task);
          cb();
        },
        comment: (cb) => {
          this.getComment(task);
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
      url: `${this.settings.spiderAPI.huoshan.user}${task.id}`,
      ua: 2
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
      result = result.body.replace(/[\n\s\r]/g, '');
      if (!result.match(/"stats":{"follower_count":(\d*)/)) {
        typeErr = {type: 'data', err: `huoshan-data-fans-正则匹配失败, data: ${JSON.stringify(result.match(/"stats":{"follower_count":(\d*)/))}`, interface: 'getUser', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      let fans = result.match(/"stats":{"follower_count":(\d*)/);
      if (!fans) {
        typeErr = {type: 'data', err: `huoshan-data-fans-null, data: ${fans}`, interface: 'getUser', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; fans = null; task = null; typeErr = null;
    });
  }
  getList(task) {
    let option = {
      url: `${this.settings.spiderAPI.huoshan.list}offset=0&count=21&user_id=${task.id}&max_time=0`,
      ua: 2
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
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getList', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.data.items || !result.data.items.length) {
        typeErr = {type: 'data', err: `huoshan-data-list-error, data: ${JSON.stringify(result.data)}`, interface: 'getList', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      this.getVideoInfo(task, result.data.items[0].id);
      option = null; result = null; task = null; typeErr = null;
    });
  }
  getVideoInfo(task, vid) {
    let option = {
      url: `${this.settings.spiderAPI.huoshan.video}${vid}`,
      ua: 2
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
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      const _$ = task.cheerio.load(result.body),
        script = _$('script').eq(15).html().replace('$', '');
      result = script.replace(/[\n\r\t]/g, '');
      result = result.substring(result.indexOf('var data = ') + 11, result.indexOf('};') + 1);
      try {
        result = JSON.parse(result);
      } catch (e) {
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result)}`, interface: 'getVideoInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result || !result.stats) {
        typeErr = {type: 'data', err: `huoshan-videoInfo-data-error, data: ${JSON.stringify(result)}`, interface: 'getVideoInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  getComment(task) {
    let option = {
      url: `https://api.huoshan.com/hotsoon/item/${task.aid}/comments/?aid=1112&os_version=10.3.1&app_name=live_stream&device_type=iPhone8,2&version_code=2.1.0&count=20&offset=0`,
      ua: 2
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result)}`, interface: 'getComment', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.extra) {
        typeErr = {type: 'data', err: `huoshan-comment-data-error, data: ${JSON.stringify(result)}`, interface: 'getComment', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
}
module.exports = dealWith;