/**
 * Created by zhupenghui on 17/6/21.
 */
const sign = (crypto, e) => {
  const md5 = crypto.createHash('md5');
  return md5.update(`100-DDwODVkv&6c4aa6af6560efff5df3c16c704b49f1&${e}`).digest('hex');
};
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('youku comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.crypto = this.modules.crypto;
    this.commentList(task, () => {
      callback();
    });
  }
  commentList(task, callback) {
    let time = parseInt(new Date().getTime() / 1000, 10),
      option = {
        url: `${this.settings.youku.list}${task.aid}&currentPage=1&sign=${sign(task.crypto, time)}&time=${time}`
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
        result = JSON.parse(result.body.replace(/[\n\r]/g, ''));
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: `评论数据: ${JSON.stringify(result.data)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;