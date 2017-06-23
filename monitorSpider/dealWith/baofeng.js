/**
 * Created by zhupenghui on 17/6/23.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('baofeng monitor begin...');
  }
  start(task, callback) {
    task.timeout = 0;
    this.getTheAlbum(task, () => {
      callback();
    });
  }
  getTheAlbum(task, callback) {
    const bidstr = task.id.toString(),
      bid = bidstr.substring(bidstr.length - 2, bidstr.length),
      option = {
        url: `http://www.baofeng.com/detail/${bid}/detail-${task.id}.html`
      };
    task.bid = bid;
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
      const $ = cheerio.load(result.body);
      let aid = $('div.episodes.clearfix').attr('m_aid');
      if (!aid) {
        aid = $('div.enc-episodes-detail').attr('m_aid');
      }
      if (!aid) {
        task.aidUrl = $('ul.hot-pic-list li').eq(0).find('a').attr('href');
        if (!aidUrl) {
          typeErr = {type: 'data', err: 'baofeng-dom-null', interface: 'getTheAlbum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          callback();
          return;
        }
        this.getAid(task, () => {
          callback();
        });
        return;
      }
      this.getList(task, aid, () => {
        callback();
      });
    });
  }
  getAid(task, callback) {
    const option = {
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
        callback();
        return;
      }
      result = result.body;
      const aid = result.match(/"aid":"\d+/).toString().replace(/"aid":"/, '');
      this.getVidList(task, aid, () => {
        callback();
      });
    });
  }
  getList(task, aid, callback) {
    const option = {
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
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      const videoList = result.video_list;
      this.support(task, videoList[0].vid);
      this.getComment(task, videoList[0].vid);
      this.getDesc(task);
    });
  }
  support(task, vid) {
    const option = {
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
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'support', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getComment(task, sid) {
    const option = {
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
      }
    });
  }
  getDesc(task) {
    const option = {
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
      const $ = cheerio.load(result.body),
        type = $('div.details-info-right a').text(),
        desc = $('div.play-details-words').text().substring(0, 100);
      if (!type && !desc) {
        typeErr = {type: 'data', err: 'baofeng-desc-dom-error', interface: 'getPlay', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;