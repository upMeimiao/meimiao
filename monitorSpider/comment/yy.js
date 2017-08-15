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
    logger.trace('yy comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.crypto = this.modules.crypto;
    this.totalPage(task, () => callback());
  }
  totalPage(task, callback) {
    const md5 = task.crypto.createHash('md5'),
      isType = Number(task.aid.substring(0, 1));
    if (isType === 1) {
      task.type = 4;
    } else if (isType === 9) {
      task.type = 3;
    }
    let option = {
      url: `${this.settings.yy}${task.aid}&index=0&type=${task.type}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'totalPage', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'totalPage', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'totalPage', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      if (!result || !result.data) {
        typeErr = {type: 'data', err: `{error: 评论列表数据异常, data: ${JSON.stringify(result)}}`, interface: 'totalPage', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;