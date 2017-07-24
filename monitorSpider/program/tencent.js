/**
 * Created by zhupenghui on 2017/7/17.
 */
const jsonp = data => data;
let async, request, logger, typeErr, infoCheck;
class program {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    async = core.modules.async;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    logger = core.settings.logger;
    logger.trace('tencent program instantiation ...');
  }
  start(task, callback) {
    this.getProgramList(task, () => {
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
      url: `${this.settings.spiderAPI.tencent.programList + task.id}&pagenum=1&_${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result || !result.folderlist) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify(result.data)}}`, interface: 'proList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.folderlist.length) {
        callback();
        return;
      }
      this.programIdlist(task, result.folderlist[0].cid);
      callback();
      option = null; result = null;  typeErr = null;
    });
  }
  programIdlist(task, proId) {
    let option = {
      url: `${this.settings.spiderAPI.tencent.proVideoList + task.id}&cid=${proId}&pagenum=1&_${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
     if (err) {
       if (err.status && err.status !== 200) {
         typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proIdList', url: option.url};
         infoCheck.interface(this.core, task, typeErr);
       } else {
         typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proIdList', url: option.url};
         infoCheck.interface(this.core, task, typeErr);
       }
       return;
     }
     try {
       result = eval(result.body);
     } catch (e) {
       typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proIdList', url: option.url};
       infoCheck.interface(this.core, task, typeErr);
       return;
     }
     if (!result || !result.videolst) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'proIdList', url: option.url};
       infoCheck.interface(this.core, task, typeErr);
     }
     option = null; result = null; typeErr = null;
    });
  }
}
module.exports = program;

