/**
 * Created by zhupenghui on 2017/7/17.
 */
let logger, typeErr;
class program {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = core.settings.logger;
    logger.trace('bili program instantiation ...');
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
      url: `${this.settings.spiderAPI.bili.programList + task.id}&_=${new Date().getTime()}`
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
        option = null; task = null; typeErr = null; result = null;
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        callback();
        return;
      }
      if (!result || result.data === '未找到数据') {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify(result.data)}}`, interface: 'proList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        callback();
        return;
      }
      if (!result.data.list.length) {
        callback();
        return;
      }
      this.programIdlist(task, result.data.list[0].id);
      callback();
      option = null; result = null;  typeErr = null; task = null;
    });
  }
  programIdlist(task, proId) {
    let option = {
      url: `http://space.bilibili.com/ajax/channel/getVideo?mid=${task.id}&cid=${proId}&p=1&num=30&order=0&_=${new Date().getTime()}`
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
       option = null; task = null; typeErr = null; result = null;
       return;
     }
     try {
       result = JSON.parse(result.body);
     } catch (e) {
       typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       task.infoCheck.interface(task.core, task, typeErr);
       option = null; task = null; typeErr = null; result = null;
       return;
     }
     if (!result || !result.data.list) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       task.infoCheck.interface(task.core, task, typeErr);
     }
      option = null; task = null; typeErr = null; result = null;
    });
  }
}
module.exports = program;

