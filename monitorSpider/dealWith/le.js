/**
 * Created by zhupenghui on 17/6/15.
 */

const jsonp = (data) => data;
let logger,  typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('le monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.async = this.modules.async;
    task.cheerio = this.modules.cheerio;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.fetchUrl = this.modules.fetchUrl;
    task.async.parallel(
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
        task = null;
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
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videolist', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videolist', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = eval(`(${result.body})`);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'videolist', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: `可能是接口变了，数据返回出问题, data: ${JSON.stringify(result)}`, interface: 'videolist', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  getInfo(task) {
    let option = {
      url: `${this.settings.spiderAPI.le.info + task.aid}&_=${(new Date()).getTime()}`,
      referer: `http://www.le.com/ptv/vplay/${task.aid}.html`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videoInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videoInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result || result.length === 0) {
        typeErr = {type: 'data', err: `le-videoInfo-aid-error, data: ${JSON.stringify(result)}`, interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  getExpr(task) {
    let option = {
      url: `http://www.le.com/ptv/vplay/${task.aid}.html`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExpr', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExpr', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      let $ = task.cheerio.load(result.body),
        timeDom = $('p.p_02 b.b_02'),
        timeDom2 = $('#video_time'),
        timeDom3 = $('li.li_04 em');
      if (timeDom.length === 0 && timeDom2.length === 0 && timeDom3.length === 0) {
        typeErr = {type: 'data', err: `le-getExpr-接口返回的数据有问题, data: ${JSON.stringify({1: timeDom.length, 2: timeDom2.length, 3: timeDom3.length})}`, interface: 'getExpr', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; $ = null; timeDom = null; timeDom2 = null; timeDom3 = null; task = null; typeErr = null;
    });
  }
  getDesc(task) {
    let option = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        referer: `http://m.le.com/vplay_${task.aid}.html`,
        'Accept-Language': 'zh-CN,zh;q=0.8',
        'Accept-Encoding': 'gzip, deflate, sdch'
      }
    };
    task.fetchUrl(this.settings.spiderAPI.le.desc + task.aid, option, (err, meta, body) => {
      if (err) {
        typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getDesc', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; body = null; task = null; typeErr = null;
        return;
      }
      if (meta.status !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(meta.status), interface: 'getDesc', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; body = null; task = null; typeErr = null;
        return;
      }
      try {
        body = JSON.parse(body.toString());
      } catch (e) {
        typeErr = {type: 'data', err: `{error: ${JSON.stringify(e.message)}, data: ${body.body}`, interface: 'getDesc', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; body = null; task = null; typeErr = null;
        return;
      }
      body = body.data.introduction;
      if (!body) {
        typeErr = {type: 'data', err: `le-getDesc-data, data: ${JSON.stringify(body)}`, interface: 'getDesc', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; body = null; task = null; typeErr = null;
    });
  }
}
module.exports = dealWith;