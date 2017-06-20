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
let logger, api, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    api = this.settings.spiderAPI;
    logger.trace('le monitor begin...');
  }
  start(task, callback) {
    async.parallel(
      {
        list: (cb) => {
          this.getTotal(task, () => {
            cb();
          });
        },
        info: (cb) => {
          this.info(task, () => {
            cb();
          });
        }
      },
      () => {
        callback();
      }
    );
  }
  getTotal(task, callback) {
    const options = {
      url: `${this.settings.spiderAPI.le.newList + task.id}/queryvideolist?callback=jsonp&orderType=0&pageSize=48&searchTitleString=&currentPage=1&_=${(new Date()).getTime()}`,
      referer: `http://chuang.le.com/u/${task.id}/videolist`,
      ua: 1
    };
    request.get(logger, options, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videolist', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videolist', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = eval(`(${result.body})`);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'videolist', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: '可能是接口变了，数据返回出问题', interface: 'videolist', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    });
  }
  info(task, callback) {
    async.parallel(
      [
        (cb) => {
          this.getInfo(task);
          cb();
        },
        (cb) => {
          this.getExpr(task);
          cb();
        },
        (cb) => {
          this.getDesc(task);
          cb();
        }
      ],
      () => {
        callback();
      }
    );
  }
  getInfo(task) {
    const options = {
      url: `${this.settings.spiderAPI.le.info + task.aid}&_=${(new Date()).getTime()}`,
      referer: `http://www.le.com/ptv/vplay/${task.aid}.html`,
      ua: 1
    };
    request.get(logger, options, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videoInfo', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videoInfo', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: 'le-videoInfo-json', interface: 'videoInfo', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result || result.length === 0) {
        typeErr = {type: 'data', err: 'le-videoInfo-aid-error', interface: 'videoInfo', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    })
  }
  getExpr(task) {
    const options = {
      url: `http://www.le.com/ptv/vplay/${task.aid}.html`,
      ua: 1
    };
    request.get(logger, options, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExpr', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExpr', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      const $ = cheerio.load(result.body),
        timeDom = $('p.p_02 b.b_02'),
        descDom = $('p.p_03'),
        timeDom2 = $('#video_time'),
        descDom2 = $('li.li_04 p'),
        timeDom3 = $('li.li_04 em'),
        descDom3 = $('li_08 em p');
      if (timeDom.length === 0 && timeDom2.length === 0 && timeDom3.length === 0) {
        typeErr = {type: 'data', err: 'le-getExpr-接口返回的数据有问题', interface: 'getExpr', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getDesc(task) {
    const options = {
      url: this.settings.spiderAPI.le.desc + task.aid,
      referer: `http://m.le.com/vplay_${task.aid}.html`,
      ua: 2,
      headers: {
        'Accept-Language': 'zh-CN,zh;q=0.8',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      }
    };
    request.get(logger, options, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getDesc', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getDesc', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        return;
      }
      result = result.data.introduction;
      if (!result) {
        typeErr = {type: 'data', err: 'le-getDesc-data', interface: 'getDesc', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;