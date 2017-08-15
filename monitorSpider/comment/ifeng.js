/**
 * Created by zhupenghui on 17/8/14.
 */
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('ifeng comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    this.getCid(task, () => callback());
  }
  getCid(task, callback) {
    let option = {
      url: `http://v.ifeng.com/docvlist/${task.aid}-1.js`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getCid', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getCid', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      result = result.body;
      if (!result || result.length <= 0 || result.match(/404.shtml/)) {
        typeErr = {type: 'data', err: `{error: 该视频已被删除, data: ${JSON.stringify(result)}}`, interface: 'getCid', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      const startIndex = result.indexOf('var data='),
        endIndex = result.indexOf(';bsCallback.getSinglePage');
      if (startIndex === -1 || endIndex === -1) {
        typeErr = {type: 'data', err: `{error: 该视频已被删除, data: ${JSON.stringify(result)}}`, interface: 'getCid', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      result = result.substring(startIndex + 9, endIndex);
      try {
        result = JSON.parse(result);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'getCid', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      if (!result || !result.dataList.length) {
        typeErr = {type: 'data', err: `{error: 当前视频数据异常, data: ${JSON.stringify(result)}}`, interface: 'getCid', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      task.cid = result.dataList[0].guid;
      this.commentList(task, () => {
        option = null; typeErr = null; result = null; task = null;
        callback();
      });
    });
  }
  commentList(task, callback) {
    let option = {
      url: `${this.settings.ifeng}${task.cid}&p=1`
    };
    task.request.get(logger, option, (err, result) => {
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
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      if (!result || !result.comments) {
        typeErr = {type: 'data', err: `{error: 评论列表数据error, data: ${JSON.stringify(result)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;