/**
 * Created by zhupenghui on 17/6/15.
 */

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('youku monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.async = this.modules.async;
    task.req = this.modules.req;
    task.infoCheck = this.modules.infoCheck;
    task.async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.getTotal(task);
          cb();
        },
        video: (cb) => {
          this.info(task);
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
      method: 'GET',
      url: `${this.settings.spiderAPI.youku.userInfo + task.encodeId}`
    };
    task.req(option, (err, res, body) => {
      if (err) {
        typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      if (res.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(res.statusCode), interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      try {
        body = JSON.parse(body)
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${body}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      if (body.code !== 1) {
        typeErr = {type: 'bid', err: `bid-error, data: ${JSON.stringify(body)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      if (!body.data) {
        typeErr = {type: 'data', err: `data-null, data: ${JSON.stringify(body)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; body = null; typeErr = null; task = null; typeErr = null;
    });
  }
  getTotal(task) {
    let option = {
        method: 'GET',
        url: this.settings.spiderAPI.youku.list,
        qs: { caller: '1', pg: '1', pl: '20', uid: task.encodeId },
        headers: {
          'user-agent': 'Youku;6.1.0;iOS;10.2;iPhone8,2'
        },
        timeout: 5000
      };
    task.req(option, (error, response, body) => {
      if (error) {
        typeErr = {type: 'error', err: JSON.stringify(error.message), interface: 'total', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      if (response.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(response.statusCode), interface: 'total', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${body}`, interface: 'total', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      if (body.code !== 1) {
        if (body.code === -503) {
          typeErr = {type: 'bid', err: `bid-error, data: ${JSON.stringify(body)}`, interface: 'total', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
          option = null; task = null; typeErr = null; body = null;
          return;
        }
        if (body.code === -102) {
          typeErr = {type: 'bid', err: `bid-error, data: ${JSON.stringify(body)}`, interface: 'total', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
          option = null; task = null; typeErr = null; body = null;
        }
        return
      }
      let data = body.data;
      if (!data) {
        typeErr = {type: 'data', err: `data-null, data: ${JSON.stringify(data)}`, interface: 'total', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; typeErr = null; body = null; data = null;
    });
  }
  info(task) {
    let ids = task.aid,
      option = {
        method: 'GET',
        url: 'https://openapi.youku.com/v2/videos/show_batch.json',
        qs: {
          client_id: this.settings.spiderAPI.youku.app_key,
          video_ids: ids
        },
        timeout: 5000
      };
    task.req(option, (error, response, body) => {
      if (error) {
        typeErr = {type: 'error', err: JSON.stringify(error.message), interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      if (response.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(response.statusCode), interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${body}`, interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      // task.infoCheck.interface();
      if (!body.videos) {
        typeErr = {type: 'data', err: `data-null(或者当前接口异常), data: ${JSON.stringify(body)}`, interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      ids = null; option = null; typeErr = null; body = null; task = null; typeErr = null;
    });
  }
  getComment(task) {
    const time = parseInt(new Date().getTime() / 1000, 10);
    let option = {
        method: 'GET',
        url: `${this.settings.spiderAPI.youku.comment + aid}&currentPage=1&sign=${sign(time)}&time=${time}`
      };
    task.req(option, (err, res, body) => {
      if (err) {
        typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      if (res.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(res.statusCode), interface: 'getComment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      try {
        body = JSON.parse(body.replace(/[\n\r]/g, ''));
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${body}`, interface: 'getComment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; body = null;
        return;
      }
      if (body.code && Number(body.code) === -4) {
        typeErr = {type: 'data', err: `comment-data-null(或者当前接口异常), data: ${JSON.stringify(body)}`, interface: 'getComment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; typeErr = null; body = null;
    });
  }
}
module.exports = dealWith;