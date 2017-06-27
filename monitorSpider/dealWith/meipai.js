/**
 * Created by zhupenghui on 17/6/19.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.classification = ['热门', '直播', '搞笑', '明星名人', '明星', '女神', '舞蹈', '音乐', '美食', '美妆', '男神', '宝宝', '宠物', '吃秀', '手工', '游戏'];
    logger = this.settings.logger;
    core = null;
    logger.trace('meipai monitor begin...');
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
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      url: this.settings.spiderAPI.meipai.userInfo + task.id
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
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      const fans = result.followers_count;
      if (!fans) {
        typeErr = {type: 'data', err: 'meipai-user-fansData-error', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  list(task) {
    let option = {
      url: `${this.settings.spiderAPI.meipai.mediaList + task.id}&max_id=`
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
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result || result.length == 0) {
        typeErr = {type: 'data', err: 'meipai-list-data-null', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      this.deal(task, result);
      option = null; result = null;
    });
  }
  deal(task, list) {
    let id = list.shift().id,
      option = {
      url: this.settings.spiderAPI.meipai.media + id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'media', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'media', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'media', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; id = null; list = null;
    });
  }
}
module.exports = dealWith;