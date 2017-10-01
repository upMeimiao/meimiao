/**
 * Created by zhupenghui on 17/8/15.
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
    logger.trace('youliao comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.cookie = cookieStr();
    this.commentId(task, () => callback());
  }
  commentId(task, callback) {
    let option = {
      url: `http://wjgl.xlmc.xunlei.com/video/share?videoId=${task.aid}&hmsr=youliaoios&newRec=true`,
      headers: {
        'Upgrade-Insecure-Requests': 1,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        cookie: task.cookie
      }
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'commentId', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'commentId', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      result = result.body.replace(/[\n\s\r]/g, '');
      const cid = result.match(/gcid='(\w*)/);
      if (!cid) {
        typeErr = {type: 'data', err: `{error: 评论列表异常, data: ${JSON.stringify(result)}}`, interface: 'commentId', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      this.commentList(task, cid[1], () => {
        option = null; typeErr = null; result = null; task = null;
        callback();
      });
    });
  }
  commentList(task, cid, callback) {
    let option = {
      url: this.settings.youliao,
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
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'commentList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'commentList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      if (!result || !result.conmments) {
        typeErr = {type: 'data', err: `{error: 评论列表异常, data: ${JSON.stringify(result)}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;