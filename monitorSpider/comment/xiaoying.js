/**
 * Created by zhupenghui on 17/8/1.
 */
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    this.h = core.h;
    logger = this.settings.logger;
    logger.trace('xiaoying comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.req = this.modules.req;
    task.infoCheck = this.modules.infoCheck;
    task.h = this.h;
    this.totalPage(task, () => callback());
  }
  totalPage(task, callback) {
    let option = {
      method: 'POST',
      url: this.settings.xiaoying,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'XiaoYing/5.5.6 (iPhone; iOS 10.2.1; Scale/3.00)'
      },
      form: {
        a: 'pa',
        b: '1.0',
        c: '20008400',
        e: 'DIqmr4fb',
        h: this.core.h,
        i: `{"d":20,"b":"1","c":1,"a":"${task.aid}"}`,
        j: 'ae788dbe17e25d0cff743af7c3225567',
        k: 'xysdkios20130711'
      }
    };
    task.req(option, (err, response, body) => {
      if (err) {
        typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'totalPage', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; body = null; task = null;
        callback();
        return;
      }
      if (response.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(response.statusCode), interface: 'totalPage', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; body = null; task = null;
        callback();
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(body)}}`, interface: 'totalPage', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; body = null; task = null;
        callback();
        return;
      }
      if (!body || !body.comments) {
        typeErr = {type: 'data', err: `{error: 评论列表数据异常, data: ${JSON.stringify(body)}}`, interface: 'totalPage', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; body = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;