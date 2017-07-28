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
    logger.trace('tv56 program instantiation ...');
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
      url: `${this.settings.spiderAPI.tv56.programList + task.id}&pg=1&_=${new Date().getTime()}`
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
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        callback();
        return;
      }
      if (!result || !result.data || !result.data.list) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify(result.data)}}`, interface: 'proList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        callback();
        return;
      }
      if (!result.data.list.length) {
        option = null; task = null; result = null; typeErr = null;
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
      url: `${this.settings.spiderAPI.tv56.programVideolist + proId}&pg=1`
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
       result = JSON.parse(result.body);
     } catch (e) {
       typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       task.infoCheck.interface(task.core, task, typeErr);
       option = null; task = null; result = null; typeErr = null;
       return;
     }
     if (!result.data || !result.data.list) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       task.infoCheck.interface(task.core, task, typeErr);
       option = null; task = null; result = null; typeErr = null;
       return;
     }
     this.playNum(task, result.data.list[0].id);
     option = null; result = null; typeErr = null; task = null;
    });
  }
  playNum(task, vids) {
    let option = {
      url: `http://vstat.v.blog.sohu.com/dostat.do?method=getVideoPlayCount&n=videoList_vids&v=${vids}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'playNum', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'playNum', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body.replace(/[\s\n\r]/g, '').replace(/varvideoList_vids=/, '').replace(/;/, ''));
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'playNum', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        return;
      }
      if (!result) {
        typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'playNum', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null;
    });
  }
}
module.exports = program;

