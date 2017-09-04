/**
 * Created by zhupenghui on 17/7/12.
 */
let logger, typeErr;
const cookieStr = () => {
  const str = 'qwertyuiopasdfghjklzxcvbnm0123456789';
  let cookie = '';
  for (let i = 0; i < 39; i += 1) {
    cookie += str.charAt(Math.floor(Math.random() * str.length));
  }
  return `wjgl_device_id=${cookie};`;
};
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('youliao monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.infoCheck = this.modules.infoCheck;
    task.cookie = cookieStr();
    task.async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        video: (cb) => {
          this.getVideoList(task);
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
      url: this.settings.spiderAPI.youliao.user + task.id,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'X-Requested-With',
        cookie: task.cookie
      }
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (!result || !result.userId || !result.userFansCount) {
        typeErr = {type: 'data', err: `youliao-粉丝数不存在或者有问题, data: ${JSON.stringify(result)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
    });
  }
  getVideoList(task) {
    let option = {
      url: this.settings.spiderAPI.youliao.list,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'X-Requested-With',
        cookie: task.cookie
      },
      data: {
        category: 'followFeed',
        orderBy: 'desc',
        pageSize: 20,
        userId: task.id
      }
    };
    task.request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (!result.data || Object.prototype.toString.call(result.data) !== '[object Array]' || !result.data.length) {
        typeErr = {type: 'data', err: JSON.stringify(result.data), interface: 'list', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      this.comment(task, result.data[0].gcid);
      option = null; typeErr = null; result = null; task = null;
    });
  }
  comment(task, cid) {
    let option = {
      url: this.settings.spiderAPI.youliao.comment,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'X-Requested-With',
        cookie: task.cookie
      },
      data: {
        tid: cid,
        typeId: 1,
        lastId: '',
        type: 'loadmore',
        pageSize: 20,
        category: 'new'
      }
    };
    task.request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'comment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'comment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'comment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (result.status !== 'ok') {
        typeErr = {type: 'data', err: `youliao-评论, data: ${JSON.stringify(result)}`, interface: 'comment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
    });
  }
}
module.exports = dealWith;