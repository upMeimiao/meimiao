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
    logger.trace('acfun program instantiation ...');
  }
  start(task, callback) {
    this.getProgramList(task, () => {
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
      url: `${this.settings.spiderAPI.acfun.programList + task.id}&pageNo=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('acfun栏目总数请求失败', err);
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
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('acfun栏目数据解析失败', result.body);
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result || result.msg !== 'ok' || !result.data || !result.data.page) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify(result.data)}}`, interface: 'proList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.data.page.list.length) {
        callback();
        return;
      }
      this.programIdlist(task, result.data.page.list[0].specialId);
      callback();
      option = null; result = null;  typeErr = null;
    });
  }
  programIdlist(task, proId) {
    let option = {
      url: `http://api.aixifan.com/albums/${proId}/contents?page={"num":1,"size":20}`
    };
    request.get(logger, option, (err, result) => {
     if (err) {
       logger.error('单个专辑请求出错', err);
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
       result = JSON.parse(result.body);
     } catch (e) {
       logger.error('专辑列表解析失败', result.body);
       typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'proIdList', url: option.url};
       infoCheck.interface(this.core, task, typeErr);
       return;
     }
     if (!result || !result.data || !result.data.list.length) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'proIdList', url: option.url};
       infoCheck.interface(this.core, task, typeErr);
     }
     option = null; result = null; typeErr = null;
    });
  }
}
module.exports = program;

