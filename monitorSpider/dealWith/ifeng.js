/**
 * Created by zhupenghui on 17/6/21.
 */
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('ifeng monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    this.getUser(task, () => {
      task = null;
      callback();
    });
  }
  getUser(task, callback) {
    let option = {
      url: `${this.settings.spiderAPI.ifeng.medialist + task.id}&pageNo=1&platformType=iPhone&protocol=1.0.1`,
      ua: 3,
      own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user-total', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user-total', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'user-total', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      if (!result.infoList || result.infoList.length === 0) {
        typeErr = {type: 'data', err: `ifeng-list-异常错误, data: ${JSON.stringify(result.infoList)}`, interface: 'user-total', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      if (!result.infoList[0] || !result.infoList[0].weMedia.followNo) {
        typeErr = {type: 'data', err: `ifeng-fans-data-error, data: ${JSON.stringify(result.infoList)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      this.getVideo(task, result.infoList[0].bodyList[0]);
      option = null; result = null; task = null;
      callback();
    });
  }
  getVideo(task, video) {
    let option = {
      url: this.settings.spiderAPI.ifeng.info + video.memberItem.guid,
      ua: 3,
      own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'video', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'video', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result) {
        typeErr = {type: 'data', err: `ifeng-video-data-error, data: ${JSON.stringify(result)}`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      this._ding(task, video.memberItem.guid);
      this._cai(task, video.memberItem.guid);
      option = null; result = null; task = null; typeErr = null;
    });
  }
  _ding(task, guid) {
    let option = {
      url: `http://survey.news.ifeng.com/getaccumulator_ext.php?key=${guid}ding&format=js&serverid=1&var=ding`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'ding', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'ding', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      result = result.body.replace('var ding=', '').replace(';', '');
      try {
        result = JSON.parse(result);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'ding', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; task = null; result = null;
        return;
      }
      if (!result || !result.browse) {
        if (Number(result.browse) !== 0) {
          typeErr = {type: 'data', err: `ifeng-ding-data-error: ${JSON.stringify(result)}`, interface: 'ding', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
  _cai(task, guid) {
    let option = {
      url: `http://survey.news.ifeng.com/getaccumulator_ext.php?key=${guid}cai&format=js&serverid=1&var=cai`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'cai', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'cai', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      result = result.body.replace('var cai=', '').replace(';', '');
      try {
        result = JSON.parse(result);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'cai', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; typeErr = null; task = null;
        return;
      }
      if (!result || !result.browse) {
        if (Number(result.browse) !== 0) {
          typeErr = {type: 'data', err: `ifeng-cai-data-error: ${JSON.stringify(result)}`, interface: 'cai', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
      }
      option = null; result = null; typeErr = null; task = null;
    });
  }
}
module.exports = dealWith;