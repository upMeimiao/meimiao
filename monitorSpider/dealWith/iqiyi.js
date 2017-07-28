/**
 * Created by zhupenghui on 17/6/15.
 */
const vm = require('vm');

const jsonp = (data) => {
  return data
};
const sandbox = {
  jsonp: data => data
};
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('iqiyi monitor begin...');
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
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.getTotal(task);
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
      url: `http://www.iqiyi.com/u/${task.id}`,
      referer: `http://www.iqiyi.com/u/${task.id}`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
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
      let $ = task.cheerio.load(result.body),
        fansDom = $('em.count a'),
        fans = fansDom.attr('data-countnum');
      if (fansDom.length === 0) {
        this.get_user(task);
        option = null; result = null; task = null; $ = null; fansDom = null;
        return;
      }
      if (!fans) {
        typeErr = {type: 'data', err: `iqiyi-user-dom-error, data: ${JSON.stringify(fans)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; $ = null; fans = null; fansDom = null; task = null;
    });
  }
  get_user(task) {
    let option = {
      url: `http://m.iqiyi.com/u/${task.id}/fans`,
      referer: `http://m.iqiyi.com/u/${task.id}`,
      ua: 2
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: err.statusCode, interface: '_user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: '_user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      let $ = task.cheerio.load(result.body),
        fans = $('h3.tle').text().substring(2);
      if (!fans) {
        typeErr = {type: 'data', err: `iqiyi-user-dom-error, data: ${JSON.stringify(fans)}`, interface: '_user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; $ = null; fans = null; task = null;
    });
  }
  getTotal(task) {
    let option = {
      ua: 1,
      url: this.settings.spiderAPI.iqiyi.list[0] + task.id + "&page=1",
      referer: 'http://www.iqiyi.com/u/' + task.id + "/v"
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
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'total', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (result.total !== 0) {
        this.getList(task);
      } else {
        this.getListN(task);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
  getListN(task) {
    let option = {
      ua: 1,
      url: `http://www.iqiyi.com/u/${task.id}/v?page=1&video_type=1&section=1`,
      referer: 'http://www.iqiyi.com/u/' + task.id + "/v"
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videoList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videoList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      let $ = task.cheerio.load(result.body, {
          ignoreWhitespace: true
        }),
        titleDom = $('p.mod-piclist_info_title a');
      if (titleDom.length === 0) {
        typeErr = {type: 'data', err: `videoList-dom-error, data: ${JSON.stringify(titleDom.length)}`, interface: 'videoList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        task = null; result = null; typeErr = null; $ = null; titleDom = null;
        return;
      }
      let video = {
        title: titleDom[0].children[0].data,
        link: titleDom[0].attribs['href']
      };
      this.getIds(task, video);
      option = null; result = null; video = null; $ = null; titleDom = null; task = null;
    });
  }
  getIds(task, raw) {
    let option = {
      ua: 1,
      url: raw.link
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getIds', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getIds', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      let $ = task.cheerio.load(result.body, {
          ignoreWhitespace: true
        }),
        id = $('#flashbox').attr('data-player-tvid');
      if (!id) {
        typeErr = {type: 'error', err: `iqiyi-tvid-error, data: ${id}`, interface: 'videoList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        task = null; typeErr = null;
        return;
      }
      raw.id = id;
      this.info(task, raw);
      option = null; result = null; $ = null; id = null; raw = null; task = null;
    });
  }
  getList(task) {
    let option = {
      ua: 1,
      url: `${this.settings.spiderAPI.iqiyi.list[0] + task.id}&page=1`,
      referer: 'http://www.iqiyi.com/u/' + task.id + "/v"
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body)
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      let data = result.data,
        $ = task.cheerio.load(data, {
          ignoreWhitespace: true
        });
      if ($('.wrap-customAuto-ht li').length === 0) {
        typeErr = {type: 'bid', err: `iqiyi-getList-(dom-error/bid-error), data: ${JSON.stringify($('.wrap-customAuto-ht li').length)}`, interface: 'getList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; $ = null;
        return;
      }
      let lis = $('li[tvid]'), ids = [],
        ats = $('a[data-title]'), titles = [],
        href = $('.site-piclist_info a[title]'), links = [];
      if (!lis || !ats || !href) {
        typeErr = {type: 'data', err: `iqiyi-getList-listData-error, data: ${JSON.stringify({lis, ats, href})}}`, interface: 'getList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        task = null; typeErr = null; lis = null; ats = null; href = null;
        return;
      }
      for (let i = 0; i < lis.length; i++) {
        ids.push(lis[i].attribs.tvid.replace(/,/g, ''))
      }
      for (let j = 0; j < ats.length; j++) {
        titles.push(ats[j].attribs['data-title'])
      }
      for (let z = 0; z < href.length; z += 1) {
        let id = href[z].attribs.href,
          end = id.indexOf('#');
        id = id.slice(0, end);
        links.push(id);
      }
      this.getInfo(task, ids[0], links[0]);
      this.getExpr(task, ids[0], links[0]);
      this.getPlay(task, ids[0], links[0]);
      option = null; result = null; data = null; $ = null; links = null;
      lis = null; ids = null; ats = null; titles = null; href = null; task = null;
    });
  }
  getInfo(task, id, link) {
    let option = {
      url: this.settings.spiderAPI.iqiyi.info + id + "?callback=jsonp&status=1",
      referer: link,
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
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (result.code != 'A00000') {
        typeErr = {type: 'data', err: `iqiyi-videoInfo-aid-error, data: ${JSON.stringify(result)}`, interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: `iqiyi-videoInfo-data-error, data: ${JSON.stringify(result.data)}`, interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (result.data.commentCount < 0) {
        this.getComment(task, result.data, link);
      }
      option = null; result = null; id = null; link = null; task = null;
    });
  }
  getExpr(task, id, link) {
    let option = {
      url: this.settings.spiderAPI.iqiyi.expr + id,
      referer: link,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExpr', url: option};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExpr', url: option};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (result.body.startsWith('statusCode')) {
        typeErr = {type: 'data', err: `iqiyi-Expr-data-error, data: ${JSON.stringify(result.body)}`, interface: 'getExpr', url: option};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = vm.runInNewContext(result.body, sandbox);
      } catch (e) {
        typeErr = {type: 'json', err:`iqiyi-Expr-json-error: ${e.message}, data: ${result.body}`, interface: 'getExpr', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (result.code != 'A00000') {
        typeErr = {type: 'data', err: `iqiyi-Expr-data-error, data: ${JSON.stringify(result)}`, interface: 'getExpr', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; id = null; link = null; task = null;
    });
  }
  getPlay(task, id, link) {
    let option = {
      url: this.settings.spiderAPI.iqiyi.play + id + '/?callback=jsonp',
      referer: link,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getPlay', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getPlay', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = eval(result.body)
      } catch (e) {
        typeErr = {type: 'json', err:  `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getPlay', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (!result || !result.length) {
        typeErr = {type: 'data', err:  `iqiyi-play-data-error, data: ${JSON.stringify(result)}`, interface: 'getPlay', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; id = null; link = null; task = null;
    });
  }
  getComment(task, data, link) {
    let option = {
      url: `http://cmts.iqiyi.com/comment/tvid/${data.qitanId}_${data.tvId}_hot_2?is_video_page=true&albumid=${data.albumId}`,
      referer: link,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'comment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'comment', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      try {
        result = JSON.parse(result.body)
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'comment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; typeErr = null; result = null;
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: `iqiyi-comment-data-error, data: ${JSON.stringify(result)}`, interface: 'comment', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; data = null; link = null; task = null;
    });
  }
}
module.exports = dealWith;