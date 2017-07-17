/**
 * Created by zhupenghui on 17/7/12.
 */
let logger, typeErr, request, infoCheck, async, req, zlib;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    async = core.modules.async;
    req = core.modules.req;
    zlib = core.modules.zlib;
    logger = this.settings.logger;
    logger.trace('aipai monitor begin...');
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
        list: (cb) => {
          this.list(task);
          cb();
        },
        video: (cb) => {
          this.video(task);
          cb();
        },
        comment: (cb) => {
          this.comment(task);
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
      url: this.settings.spiderAPI.aipai.user + task.id,
      ua: 2
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
        option = null;
        typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        option = null;
        typeErr = null;
        return;
      }
      if (Number(result.code) !== 0 || !result.data) {
        typeErr = {type: 'data', err: `aipai-粉丝数: ${JSON.stringify(result)}}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      typeErr = null;
    });
  }
  list(task) {
    let option = {
      url: `${this.settings.spiderAPI.aipai.list + task.id}_self-0_page-1.html`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        option = null;
        typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        option = null;
        typeErr = null;
        return;
      }
      if(Number(result.code) !== 0 || !result.data.length) {
        typeErr = {type: 'data', err: `aipai-视频列表: ${JSON.stringify(result.data)}}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      typeErr = null;
    });
  }
  video(task) {
    let option = {
      method: 'GET',
      url: `${this.settings.spiderAPI.aipai.video + task.aid}_os-2.html`,
      encoding: null,
      headers: {
        'User-Agent': 'Aipai/342 (iPhone; iOS 10.3.2; Scale/3.0) aipai/iOS/aipai/aipai/v(342)'
      }
    };
    req(option, (error, response, body) => {
      if (error) {
        typeErr = {type: 'error', err: JSON.stringify(error.message), interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (response.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(response.statusCode), interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (response.headers['content-encoding'] && response.headers['content-encoding'].toLowerCase().includes('gzip')) {
        body = zlib.unzipSync(body);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(body)}}`, interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (Number(body.code) !== 0 || !body.data || !body.data.assetInfo) {
        typeErr = {type: 'data', err: `aipai-单视频信息: ${JSON.stringify(body)}}`, interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      body = null;
    });
  }
  comment(task) {
    let option = {
      url: `${this.settings.spiderAPI.aipai.comment + task.aid}.html`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'comment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'comment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        option = null;
        typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(body)}}`, interface: 'comment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.total) {
        typeErr = {type: 'data', err: `aipai-评论数: ${JSON.stringify(result)}}`, interface: 'comment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      result = null;
    });
  }
}
module.exports = dealWith;