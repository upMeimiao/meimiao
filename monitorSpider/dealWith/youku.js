/**
 * Created by zhupenghui on 17/6/15.
 */
const async = require( 'neo-async' );
const request = require( 'request' );
const infoCheck = require('../controllers/infoCheck');

let logger;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('youku monitor begin...');
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
          this.getTotal(task);
          cb();
        },
        video: (cb) => {
          this.info(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task) {
    const options = {
      method: 'GET',
      url: `${this.settings.spiderAPI.youku.userInfo + task.encodeId}`
    };
    let typeErr = {};
    request(options, (err, res, body) => {
      if (err) {
        typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (res.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(res.statusCode), interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      try {
        body = JSON.parse(body)
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${body}`, interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (body.code !== 1) {
        typeErr = {type: 'bid', err: 'bid-error', interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!body.data) {
        typeErr = {type: 'data', err: 'data-null', interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getTotal(task) {
    let typeErr = {};
    const options = {
      method: 'GET',
      url: this.settings.spiderAPI.youku.list,
      qs: { caller: '1', pg: '1', pl: '20', uid: task.encodeId },
      headers: {
        'user-agent': 'Youku;6.1.0;iOS;10.2;iPhone8,2'
      },
      timeout: 5000
    };
    request(options, (error, response, body) => {
      if (error) {
        typeErr = {type: 'error', err: JSON.stringify(error.message), interface: 'total', url: JSON.stringify(options)};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (response.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(response.statusCode), interface: 'total', url: JSON.stringify(options)};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${body}`, interface: 'total', url: JSON.stringify(options)};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (body.code !== 1) {
        if (body.code === -503) {
          typeErr = {type: 'bid', err: 'bid-error', interface: 'total', url: JSON.stringify(options)};
          infoCheck.interface(this.core, task, typeErr);
          return;
        }
        if (body.code === -102) {
          typeErr = {type: 'bid', err: 'bid-error', interface: 'total', url: JSON.stringify(options)};
          infoCheck.interface(this.core, task, typeErr);
        }
      }
      const data = body.data;
      if (!data) {
        typeErr = {type: 'data', err: 'data-null', interface: 'total', url: JSON.stringify(options)};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  info(task) {
    const ids = task.aid,
      options = {
        method: 'GET',
        url: 'https://openapi.youku.com/v2/videos/show_batch.json',
        qs: {
          client_id: this.settings.spiderAPI.youku.app_key,
          video_ids: ids
        },
        timeout: 5000
      };
    let typeErr = {};
    request(options, (error, response, body) => {
      if (error) {
        typeErr = {type: 'error', err: JSON.stringify(error.message), interface: 'videoInfo', url: JSON.stringify(options)};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (response.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(response.statusCode), interface: 'videoInfo', url: JSON.stringify(options)};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${body}`, interface: 'videoInfo', url: JSON.stringify(options)};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!body.videos) {
        typeErr = {type: 'data', err: 'data-null(或者当前接口异常)', interface: 'videoInfo', url: JSON.stringify(options)};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;