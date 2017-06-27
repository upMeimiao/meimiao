
/**
 * Created by zhupenghui on 17/6/22.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('pptv monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.timeout = 0;
    this.getppi(task, () => {
      callback();
    });
  }
  getppi(task, callback) {
    let option = {
      url: 'http://tools.aplusapi.pptv.com/get_ppi?cb=jsonp'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'ppi', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'ppi', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'ppi', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result || !result.ppi) {
        typeErr = {type: 'data', err: 'pptv-ppi获取失败', interface: 'ppi', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      task.ppi = result.ppi;
      this.getList(task);
      option = null; result = null;
      callback();
    });
  }
  getList(task) {
    let option = {
      url: `${this.settings.spiderAPI.pptv.listVideo}&pid=${task.id}&cat_id=${task.encodeId}`,
      ua: 1,
      Cookie: `ppi=${this.core.ppi}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.err == -1 && !result.data) {
        if (task.timeout > 2) {
          typeErr = {type: 'data', err: 'pptv-list-error', interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          return;
        }
        task.timeout += 1;
        this.getList(task, callback);
        return;
      }
      this.getVideoInfo(task, result.data.list[0].url);
      this.getTotal(task, result.data.list[0].id);
      option = null; result = null;
    });
  }
  getVideoInfo(task, url) {
    let vid = url.match(/show\/\w*\.html/).toString().replace(/show\//, ''),
      option = {
        url,
        referer: `http://v.pptv.com/page/${vid}`,
        ua: 1
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'video', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'video', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      let $ = cheerio.load(result.body),
        time = result.body.match(/"duration":\d+/) ? result.body.match(/"duration":\d+/).toString().replace('"duration":', '') : '',
        tag = $('div#video-info .bd .tabs a').eq(0).text();
      if (!time && !tag) {
        typeErr = {type: 'data', err: 'pptv-DOM-error', interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; vid = null; $ = null; time = null; tag = null;
    });
  }
  getTotal(task, id) {
    let option = {
      url: `http://apicdn.sc.pptv.com/sc/v3/pplive/ref/vod_${id}/feed/list?appplt=web&action=1&pn=0&ps=20`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'total', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'total', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'total', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
}
module.exports = dealWith;