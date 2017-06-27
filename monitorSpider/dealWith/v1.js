/**
 * Created by zhupenghui on 17/6/22.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const fetchUrl = require('fetch').fetchUrl;
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('v1 monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.timeout = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        video: (cb) => {
          this.getVideo(task);
          cb();
        },
        videoInfo: (cb) => {
          this.getVideoInfo(task);
          cb();
        },
        support: (cb) => {
          this.getSupport(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      url: this.settings.spiderAPI.v1.newList,
      headers: {
        'User-Agent': 'V1_vodone/6.0.1 (iPhone; iOS 10.3.2; Scale/3.00)',
        'Content-Type': 'multipart/form-data; boundary=Boundary+A967927714B045D1'
      },
      data: {
        p: 0,
        s: 20,
        tid: task.id
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.body || !result.body.data) {
        typeErr = {type: 'data', err: 'v1-list-error', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getVideo(task) {
    let option = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      }
    };
    fetchUrl(`http://static.app.m.v1.cn/www/mod/mob/ctl/videoDetails/act/get/vid/${task.aid}/pcode/010210000/version/4.5.4.mindex.html`, option, (err, meta, body) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${body}`, interface: 'getVideo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      option = null; result = null;
    });
  }
  getVideoInfo(task) {
    let option = {
      url: `http://www.v1.cn/video/${task.aid}.jhtml`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideoInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      let $ = cheerio.load(result.body),
        tag = this.getTag($('li.summaryList_item ul.tagList li')),
        desc = $('p.summaryList_long').text();
      if (!tag && desc) {
        typeErr = {type: 'data', err: 'v1-data-DOM-error', interface: 'getVideoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; $ = null; tag = null; desc = null;
    });
  }
  getSupport(task) {
    let option = {
      url: `http://user.v1.cn/openapi/getVideoPraise.json?videoId=${task.aid}&callback=jsonp`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getSupport', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getSupport', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getSupport', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getTag(desc) {
    let str = '';
    for (let i = 0; i < desc.length; i += 1) {
      if (desc.eq(i).text().replace(/\s/g, '') === '') {
        str += '';
      } else {
        str += `${desc.eq(i).text()} `;
      }
    }
    return str;
  }
}
module.exports = dealWith;