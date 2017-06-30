/**
 * Created by zhupenghui on 17/6/15.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const jsonp = (data) => {
  return data
};
let logger,  typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('le monitor begin...');
    core = null;
  }
  start(task, callback) {
    async.parallel(
      {
        list: (cb) => {
          this.getTotal(task);
          cb();
        },
        info: (cb) => {
          this.getInfo(task);
          cb();
        },
        expr: (cb) => {
          this.getExpr(task);
          cb();
        },
        desc: (cb) => {
          this.getDesc(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
  }
  getTotal(task) {
    let option = {
      url: `${this.settings.spiderAPI.le.newList + task.id}/queryvideolist?callback=jsonp&orderType=0&pageSize=48&searchTitleString=&currentPage=1&_=${(new Date()).getTime()}`,
      referer: `http://chuang.le.com/u/${task.id}/videolist`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videolist', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videolist', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(`(${result.body})`);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'videolist', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: '可能是接口变了，数据返回出问题', interface: 'videolist', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getInfo(task) {
    let option = {
      url: `${this.settings.spiderAPI.le.info + task.aid}&_=${(new Date()).getTime()}`,
      referer: `http://www.le.com/ptv/vplay/${task.aid}.html`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videoInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videoInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'videoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result || result.length === 0) {
        typeErr = {type: 'data', err: 'le-videoInfo-aid-error', interface: 'videoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getExpr(task) {
    let option = {
      url: `http://www.le.com/ptv/vplay/${task.aid}.html`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExpr', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExpr', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      let $ = cheerio.load(result.body),
        timeDom = $('p.p_02 b.b_02'),
        timeDom2 = $('#video_time'),
        timeDom3 = $('li.li_04 em');
      if (timeDom.length === 0 && timeDom2.length === 0 && timeDom3.length === 0) {
        typeErr = {type: 'data', err: 'le-getExpr-接口返回的数据有问题', interface: 'getExpr', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; $ = null; timeDom = null; timeDom2 = null; timeDom3 = null;
    });
  }
  getDesc(task) {
    let option = {
      url: this.settings.spiderAPI.le.desc + task.aid,
      referer: `http://m.le.com/vplay_${task.aid}.html`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getDesc', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getDesc', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'data', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getDesc', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      result = result.data.introduction;
      if (!result) {
        typeErr = {type: 'data', err: 'le-getDesc-data', interface: 'getDesc', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
}
module.exports = dealWith;