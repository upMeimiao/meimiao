/**
 * Created by zhupenghui on 17/7/31.
 */
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('kuaibao comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    this.commentList(task, () => {
      callback();
    });
  }
  commentList(task, callback) {
    let option = {
      url: this.settings.kuaibao.commentList,
      timeout: 5000,
      headers: {
        'User-Agent': '%e5%a4%a9%e5%a4%a9%e5%bf%ab%e6%8a%a5 2.8.0 qnreading (iPhone; iOS 10.3.3; zh_CN; 2.8.0.11)',
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'http://r.cnews.qq.com/inews/iphone/',
        appversion: '0',
        apptypeExt: 'qnreading',
        Connection: 'keep-alive',
        'device-model': 'iPhone8,2',
        apptype: 'ios'
      },
      data: {
        chlid: 'daily_timeline',
        c_type: 'comment',
        article_id: task.aid,
        byaid: 1,
        page: 1
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
      if (Number(result.ret) !== 0) {
        typeErr = {type: 'data', err: `评论列表异常: ${JSON.stringify(result)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;