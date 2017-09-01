/**
 * Created by zhupenghui on 17/6/19.
 */

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.classification = ['热门', '直播', '搞笑', '明星名人', '明星', '女神', '舞蹈', '音乐', '美食', '美妆', '男神', '宝宝', '宠物', '吃秀', '手工', '游戏'];
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('meipai monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.infoCheck = this.modules.infoCheck;
    task.async.parallel(
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
        task = null;
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      url: this.settings.spiderAPI.meipai.userInfo + task.id
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result || !result.followers_count) {
        typeErr = {type: 'data', err: `meipai-user-fansData-error, data: ${JSON.stringify(result)}`, interface: 'user', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  list(task) {
    let option = {
      url: `${this.settings.spiderAPI.meipai.mediaList + task.id}&max_id=`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result || result.length == 0) {
        typeErr = {type: 'data', err: `meipai-list-data-null, data: ${JSON.stringify(result)}`, interface: 'list', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      this.deal(task, result);
      option = null; result = null; task = null; typeErr = null;
    });
  }
  deal(task, list) {
    let id = list.shift().id,
      option = {
      url: this.settings.spiderAPI.meipai.media + id
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'media', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'media', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null; list = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'media', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null; list = null;
        return;
      }
      if (result.lives) {
        typeErr = {type: 'data', err: `meipai-media-data-error, data: ${JSON.stringify(result)}`, interface: 'media', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; id = null; list = null; task = null; typeErr = null;
    });
  }
}
module.exports = dealWith;