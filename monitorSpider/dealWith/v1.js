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
    logger.trace('v1 monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.async = this.modules.async;
    task.request = this.modules.request;
    task.cheerio = this.modules.cheerio;
    task.fetchUrl = this.modules.fetchUrl;
    task.infoCheck = this.modules.infoCheck;
    task.async.parallel(
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
        task = null;
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
    task.request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.body || !result.body.data) {
        typeErr = {type: 'data', err: `v1-list-error, data: ${JSON.stringify(result)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  getVideo(task) {
    let option = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      }
    };
    task.fetchUrl(`http://static.app.m.v1.cn/www/mod/mob/ctl/videoDetails/act/get/vid/${task.aid}/pcode/010210000/version/4.5.4.mindex.html`, option, (err, meta, body) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; body = null; task = null; typeErr = null;
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${body}`, interface: 'getVideo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; body = null; task = null; typeErr = null;
        return;
      }
      if (!body.body || !body.body.obj || !body.body.obj.videoDetail) {
          typeErr = {type: 'data', err: `v1-video-data-error, data: ${JSON.stringify(body)}`, interface: 'getVideo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        return;
      }
      option = null; body = null; task = null; typeErr = null;
    });
  }
  getVideoInfo(task) {
    let option = {
      url: `http://www.v1.cn/video/${task.aid}.jhtml`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideoInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      let $ = task.cheerio.load(result.body),
        tag = this.getTag($('li.summaryList_item ul.tagList li')),
        desc = $('p.summaryList_long').text();
      if (!tag && desc) {
        typeErr = {type: 'data', err: `v1-data-DOM-error, data: ${JSON.stringify(tag, '&&&', desc)}`, interface: 'getVideoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; $ = null; tag = null; desc = null; task = null; typeErr = null;
    });
  }
  getSupport(task) {
    let option = {
      url: `http://user.v1.cn/openapi/getVideoPraise.json?videoId=${task.aid}&callback=jsonp`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getSupport', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getSupport', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getSupport', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result) {
        typeErr = {type: 'data', err: `v1-support-data-error, data: ${JSON.stringify(result)}`, interface: 'getSupport', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
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