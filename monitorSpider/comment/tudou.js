/**
 * Created by zhupenghui on 17/8/1.
 */
const sign = (crypto, e) => {
  const md5 = crypto.createHash('md5');
  return md5.update(`700-cJpvjG4g&bad4543751cacf3322ab683576474e31&${e}`).digest('hex');
};
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('tudou comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.crypto = this.modules.crypto;
    this.commentList(task, () => callback());
  }
  commentList(task, callback) {
    const time = new Date().getTime().toString().substring(0, 10);
    let option = {
      url: `${this.settings.tudou.commentId}${task.aid}&objectType=1&listType=0&currentPage=1&pageSize=30&sign=${sign(task.crypto, time)}&time=${time}`
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
      if  (!result.data || !result.data.comment) {
        typeErr = {type: 'json', err: `{error: 评论列表数据异常, data: ${JSON.stringify(result)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;