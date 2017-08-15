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
    logger.trace('v1 comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    this.commentList(task, () => callback());
  }
  commentList(task, callback) {
    let option = {
      url: this.settings.v1,
      headers: {
        'User-Agent': 'V1_vodone/6.1.2 (iPhone; iOS 10.3.2; Scale/3.00)',
        'Content-Type': 'multipart/form-data; boundary=Boundary+44C47EA48862ADB4'
      },
      data: {
        type: 1,
        vid: task.aid,
        last_id: 0
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
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      if (Number(task.id) === 8710632) {
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      if (!result.body || !result.body.data) {
        typeErr = {type: 'data', err: `{error: 评论列表数据error, data: ${JSON.stringify(result)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;