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
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('iqiyi monitor begin...');
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb();
          })
        },
        list: (cb) => {
          this.getTotal(task, () => {
            cb(null, '视频信息已返回');
          });
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task, callback) {
    const option = {
      url: `http://www.iqiyi.com/u/${task.id}`,
      referer: `http://www.iqiyi.com/u/${task.id}`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      const $ = cheerio.load(result.body),
        fansDom = $('em.count a'),
        fans = fansDom.attr('data-countnum');
      if (fansDom.length === 0) {
        this.get_user(task, () => {
          callback();
        });
        return;
      }
      if (!fans) {
        typeErr = {type: 'data', err: 'iqiyi-user-dom-error', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    })
  }
  get_user(task, callback) {
    const option = {
      url: `http://m.iqiyi.com/u/${task.id}/fans`,
      referer: `http://m.iqiyi.com/u/${task.id}`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: err.statusCode, interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      let $ = cheerio.load(result.body),
        fans = $('h3.tle').text().substring(2);
      if (!fans) {
        typeErr = {type: 'data', err: 'iqiyi-user-dom-error', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback()
    })
  }
  getTotal(task, callback) {
    const option = {
      ua: 1,
      url: this.settings.spiderAPI.iqiyi.list[0] + task.id + "&page=1",
      referer: 'http://www.iqiyi.com/u/' + task.id + "/v"
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
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'total', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (result.total !== 0) {
        this.getList(task, () => {
          callback()
        })
      } else {
        this.getListN(task, () => {
          callback()
        })
      }
    });
  }
  getListN(task, callback) {
    const option = {
      ua: 1,
      url: `http://www.iqiyi.com/u/${task.id}/v?page=1&video_type=1&section=1`,
      referer: 'http://www.iqiyi.com/u/' + task.id + "/v"
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videoList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videoList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      const $ = cheerio.load(result.body, {
          ignoreWhitespace: true
        }),
        titleDom = $('p.mod-piclist_info_title a');
      if (titleDom.length === 0) {
        typeErr = {type: 'data', err: 'videoList-dom-error', interface: 'videoList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      const video = {
        title: titleDom[0].children[0].data,
        link: titleDom[0].attribs['href']
      };
      this.getIds(task, video, () => {
        callback();
      })
    })
  }
  getIds(task, raw, callback) {
    const option = {
      ua: 1,
      url: raw.link
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getIds', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getIds', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      const $ = cheerio.load(result.body, {
          ignoreWhitespace: true
        }),
        id = $('#flashbox').attr('data-player-tvid');
      if (!id) {
        typeErr = {type: 'error', err: 'iqiyi-tvid-error', interface: 'videoList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      raw.id = id;
      this.info(task, raw, () => {
        logger.debug('***');
        callback();
      });
    })
  }
  getList(task, callback) {
    const option = {
      ua: 1,
      url: `${this.settings.spiderAPI.iqiyi.list[0] + task.id}&page=1`,
      referer: 'http://www.iqiyi.com/u/' + task.id + "/v"
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body)
      } catch (e) {
        typeErr = {type: 'json', err: 'iqiyi-getList-json-error', interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      const data = result.data,
        $ = cheerio.load(data, {
          ignoreWhitespace: true
        });
      if ($('.wrap-customAuto-ht li').length === 0) {
        typeErr = {type: 'bid', err: 'iqiyi-getList-(dom-error/bid-error)', interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      const lis = $('li[tvid]'), ids = [],
        ats = $('a[data-title]'), titles = [],
        href = $('.site-piclist_info a[title]'), links = [];
      if (!lis || !ats || !href) {
        typeErr = {type: 'data', err: 'iqiyi-getList-listData-error', interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
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
        links.push(id)
      }
      const dataInfo = {
        id: ids[0],
        title: titles[0],
        link: links[0]
      };
      this.info(task, dataInfo, () => {
        callback();
      })
    })
  }
  info(task, info, callback) {
    let id = info.id, title = info.title, link = info.link;
    async.parallel(
      [
        (cb) => {
          this.getInfo(task, id, link);
          cb();
        },
        (cb) => {
          this.getExpr(task, id, link);
          cb();
        },
        (cb) => {
          this.getPlay(task, id, link);
          cb();
        }
      ],
      () => {
        callback();
      }
    );
  }
  getInfo(task, id, link) {
    let option = {
      url: this.settings.spiderAPI.iqiyi.info + id + "?callback=jsonp&status=1",
      referer: link,
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
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: 'iqiyi-videoInfo-json', interface: 'videoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.code != 'A00000') {
        typeErr = {type: 'data', err: 'iqiyi-videoInfo-aid-error', interface: 'videoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: 'iqiyi-videoInfo-data-error', interface: 'videoInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.data.commentCount < 0) {
        this.getComment(result.data, link)
      }
    })
  }
  getExpr(task, id, link) {
    const option = {
      url: this.settings.spiderAPI.iqiyi.expr + id,
      referer: link,
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
      try {
        result = eval(`(${result.body})`);
      } catch (e) {
        typeErr = {type: 'json', err:`'iqiyi-Expr-json-error': ${e.message}, data: ${result.body}`, interface: 'getExpr', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.code != 'A00000') {
        typeErr = {type: 'data', err: 'iqiyi-Expr-data-error', interface: 'getExpr', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
    });
  }
  getPlay(task, id, link) {
    const option = {
      url: this.settings.spiderAPI.iqiyi.play + id + '/?callback=jsonp',
      referer: link,
      ua: 1
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
      try {
        result = eval(result.body)
      } catch (e) {
        typeErr = {type: 'json', err: 'iqiyi-play-json-error', interface: 'getPlay', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
    });
  }
  getComment(data, link) {
    const option = {
      url: `http://cmts.iqiyi.com/comment/tvid/${data.qitanId}_${data.tvId}_hot_2?is_video_page=true&albumid=${data.albumId}`,
      referer: link,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'comment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'comment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body)
      } catch (e) {
        typeErr = {type: 'json', err: 'iqiyi-comment-json-error', interface: 'comment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: 'iqiyi-comment-data-error', interface: 'comment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
    });
  }
}
module.exports = dealWith;