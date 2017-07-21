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
    logger.trace('youku program instantiation ...');
  }
  start(task, callback) {
    this.getProgramList(task, () => {
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
      url: `${this.settings.spiderAPI.youku.programList + task.encodeId}&pg=1&_t_=${parseInt(new Date().getTime() / 1000, 10)}`,
      ua: 3,
      own_ua: 'Youku;6.7.4;iOS;10.3.2;iPhone8,2'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(response.statusCode), interface: 'proList', url: JSON.stringify(option)};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proList', url: JSON.stringify(option)};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proList', url: JSON.stringify(option)};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      // console.log(result);
      if (!result || !result.data || !result.data.items) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify(result.data)}}`, interface: 'proList', url: JSON.stringify(option)};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.data.items.length) {
        callback();
        return;
      }
      this.programIdlist(task, result.data.items[0].folderId_encode);
      callback();
      option = null; result = null;  typeErr = null;
    });
  }
  programIdlist(task, proId) {
    let option = {
      url: this.settings.spiderAPI.youku.albumList + proId,
      ua: 3,
      own_ua: 'Youku;6.7.4;iOS;10.3.2;iPhone8,2'
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
       result = JSON.parse(result.body);
     } catch (e) {
       typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       infoCheck.interface(this.core, task, typeErr);
       return;
     }
     if (Number(result.code) !== 0 || !result.result || !result.result.videos) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       infoCheck.interface(this.core, task, typeErr);
     }
     option = null; result = null; typeErr = null;
    });
  }
}
module.exports = program;

