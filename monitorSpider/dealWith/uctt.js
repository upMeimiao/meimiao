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
    logger.trace('uctt monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.cheerio = this.modules.cheerio;
    task.infoCheck = this.modules.infoCheck;
    task.async.parallel(
      {
        list: (cb) => {
          this.getList(task);
          cb();
        },
        vidInfo: (cb) => {
          this.getVidInfo(task);
          cb();
        }
      },
      () => {
        task = null;
        callback();
      }
    );
  }
  getList(task) {
    let option = {
      url: `http://napi.uc.cn/3/classes/article/categories/wemedia/lists/${task.id}?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_size=5&_max_pos=&uc_param_str=frdnsnpfvecpntnwprdsssnikt`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result.data || result.data.length === 0) {
        typeErr = {type: 'data', err: `UC头条监控完成, data: ${JSON.stringify(result)}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; result = null; typeErr = null;
    });
  }
  getVidInfo(task) {
    let option = {
      url: `http://m.uczzd.cn/ucnews/video?app=ucnews-iflow&fr=iphone&aid=${task.aid.split('_')[0]}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = result.body.replace(/[\r\n]/g, '');
        let $ = task.cheerio.load(result);
        if ($('p.info').text() === '文章不存在') {
          typeErr = {type: 'data', err: 'uctt-content-null', interface: 'getVidInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
          option = null; task = null; result = null; typeErr = null; $ = null;
          return;
        }
        result = result.replace(/[\s]/g, '');
        const startIndex = result.indexOf('xissJsonData='),
          endIndex = result.indexOf(';varzzdReadId');
        result = result.substring(startIndex + 13, endIndex);
        result = JSON.parse(result);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result}`, interface: 'getVidInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result) {
        typeErr = {type: 'data', err: `uctt-data-null, data: ${JSON.stringify(result)}`, interface: 'getVidInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      this.getCommentNum(task, task.aid.split('_')[1], result.id);
      option = null; task = null; result = null; typeErr = null;
    });
  }
  getCommentNum(task, _id, id) {
    let option = {},
      num = null;
    option.url = `http://m.uczzd.cn/iflow/api/v2/cmt/article/${id}/comments/byhot?count=10&fr=iphone&dn=11341561814-acaf3ab1&hotValue=`;
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getCommentNum', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getCommentNum', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getCommentNum', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result || !result.data) {
        typeErr = {type: 'data', err: `uctt-data-null, data: ${JSON.stringify(result)}`, interface: 'getCommentNum', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      num = result.data.comment_cnt;
      this.getDesc(task, _id);
      option = null; task = null; result = null; typeErr = null;
    });
  }
  getDesc(task, _id) {
    let option = {
      url: `http://napi.uc.cn/3/classes/article/objects/${_id}?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_ch=article`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getDesc', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getDesc', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getDesc', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: `uctt-desc-data-error, data: ${JSON.stringify(result)}`, interface: 'getDesc', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; result = null; typeErr = null;
    });
  }
}
module.exports = dealWith;