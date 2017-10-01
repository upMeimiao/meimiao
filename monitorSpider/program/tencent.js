/**
 * Created by zhupenghui on 2017/7/17.
 */
const jsonp = data => data;
let logger, typeErr;
class program {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = core.settings.logger;
    logger.trace('tencent program instantiation ...');
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    this.getProgramList(task, () => {
      task = null;
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
      url: `${this.settings.spiderAPI.tencent.programList + task.id}&pagenum=1&_${new Date().getTime()}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        callback();
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        callback();
        return;
      }
      if (!result || !result.folderlist) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify(result.data)}}`, interface: 'proList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        callback();
        return;
      }
      if (!result.folderlist.length) {
        option = null; task = null; result = null; typeErr = null;
        callback();
        return;
      }
      this.programIdlist(task, result.folderlist[0].cid);
      callback();
      option = null; result = null;  typeErr = null; task = null;
    });
  }
  programIdlist(task, proId) {
    let option = {
      url: `${this.settings.spiderAPI.tencent.proVideoList + task.id}&cid=${proId}&pagenum=1&_${new Date().getTime()}`
    };
    task.request.get(logger, option, (err, result) => {
     if (err) {
       if (err.status && err.status !== 200) {
         typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proIdList', url: JSON.stringify(option)};
         task.infoCheck.interface(task.core, task, typeErr);
       } else {
         typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proIdList', url: JSON.stringify(option)};
         task.infoCheck.interface(task.core, task, typeErr);
       }
       option = null; task = null; result = null; typeErr = null;
       return;
     }
     try {
       result = eval(result.body);
     } catch (e) {
       typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       task.infoCheck.interface(task.core, task, typeErr);
       option = null; task = null; result = null; typeErr = null;
       return;
     }
     if (!result || !result.videolst) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       task.infoCheck.interface(task.core, task, typeErr);
     }
     option = null; result = null; typeErr = null; task = null;
    });
  }
}
module.exports = program;

