/**
 * Created by zhupenghui on 17/6/23.
 */
let logger, typeErr, cheerio, request, infoCheck;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    cheerio = core.modules.cheerio;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    logger = this.settings.logger;
    logger.trace('baofeng monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.timeout = 0;
    this.getTheAlbum(task, () => {
      callback();
    });
  }
  getTheAlbum(task, callback) {
    let bidstr = task.id.toString(),
      bid = bidstr.substring(bidstr.length - 2, bidstr.length),
      option = {
        url: `http://www.baofeng.com/detail/${bid}/detail-${task.id}.html`
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getTheAlbum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getTheAlbum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      let $ = cheerio.load(result.body),
        aid = $('div.episodes.clearfix').attr('m_aid');
      if (!aid) {
        aid = $('div.enc-episodes-detail').attr('m_aid');
      }
      if (!aid) {
        task.aidUrl = $('ul.hot-pic-list li').eq(0).find('a').attr('href');
        if (!task.aidUrl) {
          typeErr = {type: 'data', err: 'baofeng-dom-null', interface: 'getTheAlbum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          callback();
          return;
        }
        this.getAid(task);
        option = null; typeErr = null; aid = null; $ = null; bidstr = null; bid = null;
        callback();
        return;
      }
      this.getList(task, aid);
      option = null; typeErr = null; aid = null; $ = null; bidstr = null; bid = null;
      callback();
    });
  }
  getAid(task) {
    let option = {
      url: `http://www.baofeng.com/${this.aidUrl}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getAid', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getAid', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      result = result.body;
      let aid = result.match(/"aid":"\d+/).toString().replace(/"aid":"/, '');
      if (!aid) {
        typeErr = {type: 'data', err: 'baofeng-获取aid失败-DOM结构可能有问题', interface: 'getAid', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      this.getVidList(task, aid);
      result = null; option = null; aid = null;
    });
  }
  getList(task, aid) {
    let option = {
      url: `http://minfo.baofeng.net/asp_c/13/124/${aid}-n-100-r-50-s-1-p-1.json?_random=false`
    };
    request.get(logger, option, (err, result) => {
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
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}}`, interface: 'getVideo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result || !result.video_list.length) {
        typeErr = {type: 'data', err: 'baofeng-获取视频信息失败', interface: 'getVideo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      let videoList = result.video_list;
      this.support(task, videoList[0].vid);
      this.getComment(task, videoList[0].vid);
      this.getDesc(task);
      option = null; videoList = null;
    });
  }
  support(task, vid) {
    let option = {
      url: `http://hd.baofeng.com/api/getud?wid=13&vid=${vid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'support', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'support', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}}`, interface: 'support', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return
      }
      if (!result) {
        typeErr = {type: 'data', err: `baofeng-support-数据异常: data:${JSON.stringify(result)}`, interface: 'support', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      typeErr = null; option = null; result = null;
    });
  }
  getComment(task, sid) {
    let option = {
      url: `http://comments.baofeng.com/pull?type=movie&from=2&sort=hot&xid=${sid}&page=1&pagesize=6`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result) {
        typeErr = {type: 'json', err: `baofeng-comment-数据异常: ${JSON.stringify(result)}`, interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; typeErr = null; result = null;
    });
  }
  getDesc(task) {
    let option = {
      url: `http://m.baofeng.com/play/73/play-${task.id}-drama-1.html`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getPlay', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getPlay', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      let $ = cheerio.load(result.body),
        type = $('div.details-info-right a').text(),
        desc = $('div.play-details-words').text().substring(0, 100);
      if (!type && !desc) {
        typeErr = {type: 'data', err: 'baofeng-desc-dom-error', interface: 'getPlay', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; $ = null; type = null; desc = null;
    });
  }
}
module.exports = dealWith;