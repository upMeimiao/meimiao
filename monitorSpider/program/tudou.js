/**
 * Created by zhupenghui on 2017/7/17.
 */
let async, request, logger, typeErr, infoCheck;
class program {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    async = core.modules.async;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    logger = core.settings.logger;
    logger.trace('tudou program instantiation ...');
  }
  start(task, callback) {
    this.getProgramList(task, () => {
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
      url: `${this.settings.spiderAPI.tudou.programList + task.encodeId}&pg=1`,
      ua: 3,
      own_ua: 'Tudou;6.6.1;iOS;10.3.2;iPhone8,2'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proList', url: JSON.stringify(option)};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proList', url: JSON.stringify(option)};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proList', url: JSON.stringify(option)};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result || !result.data) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify(result.data)}}`, interface: 'proList', url: JSON.stringify(option)};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.data.playlists.items.length) {
        callback();
        return;
      }
      this.programIdlist(task, result.data.playlists.items[0].folderId_encode);
      callback();
      option = null; result = null;  typeErr = null;
    });
  }
  programIdlist(task, proId) {
    let option = {
      url: this.settings.spiderAPI.tudou.proVideoList + proId,
      ua: 3,
      own_ua: 'Tudou;6.6.1;iOS;10.3.2;iPhone8,2'
    };
    request.get(logger, option, (err, result) => {
     if (err) {
       if (err.status && err.status !== 200) {
         typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proIdList', url: JSON.stringify(option)};
         infoCheck.interface(this.core, task, typeErr);
       } else {
         typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proIdList', url: JSON.stringify(option)};
         infoCheck.interface(this.core, task, typeErr);
       }
       return;
     }
     try {
       result = eval(result.body);
     } catch (e) {
       typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       infoCheck.interface(this.core, task, typeErr);
       return;
     }
     if (!result.result || !result.result.videos) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       infoCheck.interface(this.core, task, typeErr);
     }
     option = null; result = null; typeErr = null;
    });
  }
}
module.exports = program;

