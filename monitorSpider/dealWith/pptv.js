
/**
 * Created by zhupenghui on 17/6/22.
 */

const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('pptv monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.timeout = 0;
    task.core = this.core;
    task.request = this.modules.request;
    task.cheerio = this.modules.cheerio;
    task.infoCheck = this.modules.infoCheck;
    this.getppi(task, () => {
      task = null;
      callback();
    });
  }
  getppi(task, callback) {
    let option = {
      url: 'http://tools.aplusapi.pptv.com/get_ppi?cb=jsonp'
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'ppi', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'ppi', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'ppi', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      if (!result || !result.ppi) {
        typeErr = {type: 'data', err: `pptv-ppi获取失败, data: ${JSON.stringify(result)}`, interface: 'ppi', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      task.ppi = result.ppi;
      this.getList(task);
      option = null; result = null; task = null; typeErr = null;
      callback();
    });
  }
  getList(task) {
    let option = {
      url: `${this.settings.spiderAPI.pptv.listVideo}&pid=${task.id}&cat_id=${task.encodeId}`,
      ua: 1,
      Cookie: `ppi=${this.core.ppi}`
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
        task = null; typeErr = null;option = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        task = null; typeErr = null;option = null; result = null;
        return;
      }
      if (result.err == -1 && !result.data) {
        if (task.timeout > 2) {
          typeErr = {type: 'data', err: `pptv-list-error, data: ${JSON.stringify(result)}`, interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
          task = null; typeErr = null;option = null; result = null;
          return;
        }
        task.timeout += 1;
        this.getList(task, callback);
        return;
      }
      this.getVideoInfo(task, result.data.list[0].url);
      this.getTotal(task, result.data.list[0].id);
      task = null; typeErr = null;option = null; result = null;
    });
  }
  getVideoInfo(task, url) {
    let vid = url.match(/show\/\w*\.html/).toString().replace(/show\//, ''),
      option = {
        url,
        referer: `http://v.pptv.com/page/${vid}`,
        ua: 1
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
        task = null; typeErr = null;option = null; result = null;
        return;
      }
      let $ = task.cheerio.load(result.body),
        time = result.body.match(/"duration":\d+/) ? result.body.match(/"duration":\d+/).toString().replace('"duration":', '') : '',
        tag = $('div#video-info .bd .tabs a').eq(0).text();
      if (!time && !tag) {
        typeErr = {type: 'data', err: `pptv-DOM-error`, interface: 'video', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; vid = null; $ = null; time = null; tag = null; task = null; typeErr = null;
    });
  }
  getTotal(task, id) {
    let option = {
      url: `http://apicdn.sc.pptv.com/sc/v3/pplive/ref/vod_${id}/feed/list?appplt=web&action=1&pn=0&ps=20`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'total', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'total', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        task = null; typeErr = null;option = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'total', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        task = null; typeErr = null;option = null; result = null;
        return;
      }
      if (!result || !result.data) {
        typeErr = {type: 'data', err: `pptv-total-data-error, data: ${JSON.stringify(result)}`, interface: 'total', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      task = null; typeErr = null;option = null; result = null;
    });
  }
}
module.exports = dealWith;