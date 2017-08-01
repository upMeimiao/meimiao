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
    logger.trace('toutiao comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    this.getGroupId(task, () => {
      callback();
    });
  }
  getGroupId(task, callback) {
    let option = {
        url: `http://www.365yg.com/item/${task.aid}/`
      },
      groupId = '',
      startIndex = null,
      endIndex = null;
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getGroupId', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getGroupId', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      startIndex = result.indexOf('player=');
      endIndex = result.indexOf(',nextSiblings');
      if (startIndex === -1 || endIndex === -1) {
        groupId = task.aid;
      } else {
        groupId = result.substring(startIndex + 7, endIndex + 5);
        groupId = groupId.replace(',next', '}').replace(/'/g, '"').replace(/:/g, '":').replace(/,/g, ',"')
          .replace('{', '{"')
          .replace('http"', 'http');
        groupId = JSON.parse(groupId).group_id;
      }
      if (!groupId) {
        task.group_id = task.aid;
      } else if (groupId == task.aid) {
        task.group_id = task.aid;
      } else {
        task.group_id = groupId;
      }
      this.commentList(task, () => {
        option = null; typeErr = null; result = null; task = null;
        callback();
      });
    });
  }
  commentList(task, callback) {
    let option = {
      url: `${this.settings.toutiao}${task.group_id}&offset=0`
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
      if (!result.data) {
        typeErr = {type: 'data', err: `评论列表异常: ${JSON.stringify(result)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;