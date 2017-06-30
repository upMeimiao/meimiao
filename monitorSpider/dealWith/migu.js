/**
 * Created by zhupenghui on 17/6/20.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('migu monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.total = 0;
    this.getUser(task, () => {
      callback();
    });
  }
  getUser(task, callback) {
    let option = {
      url: `${this.settings.spiderAPI.gumi.list + task.id}&pageNo=1`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      }
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
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.data || !result.data.userInfo) {
        typeErr = {type: 'data', err: 'migu-user-fans-data-error', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.data.opusList) {
        typeErr = {type: 'data', err: 'migu-user-list-data-error', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      this.getComment(task, result.data.opusList[0].hwOpusId);
      option = null; result = null;
      callback();
    });
  }
  getComment(task, vid) {
    let option = {
      url: this.settings.spiderAPI.gumi.comment + vid,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        Referer: `http://m.migudm.cn/ugc/${vid}.html`,
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    request.post(logger, option, (err, result) => {
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
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: 'migu-comment-data-error', interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
}
module.exports = dealWith;