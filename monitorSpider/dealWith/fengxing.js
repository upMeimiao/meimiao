/**
 * Created by zhupenghui on 17/6/22.
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
    logger.trace('fengxing monitor begin...');
  }
  start(task, callback) {
    task.timeout = 0;
    this.getVideo(task, () => {
      callback();
    });
  }
  getUser(task) {
    const name = encodeURIComponent(task.name),
      option = {
      url: `http://www.fun.tv/search/?word=${name}&type=site`
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
        return;
      }
      const $ = cheerio.load(result.body),
        list = $('div.search-result>div.search-item'),
        user = {};
      for (let i = 0; i < list.length; i += 1) {
        const bid = list.eq(i).attr('block').match(/g_\d*/).toString()
          .replace('g_', '');
        if (task.id == bid) {
          user.fans_num = list.eq(i).find('div.mod-li-i div.mod-sub-wrap span.sub-tip b').text();
          break;
        }
      }
      if (!user.fans_num) {
        typeErr = {type: 'data', err: 'fengxing-dom-fans-error', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getVideo(task, callback) {
    const option = {};
    if (task.id.toString().length < 6) {
      option.url = `http://www.fun.tv/channel/lists/${task.id}/`;
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
        const $ = cheerio.load(result.body),
          vidObj = $('div.mod-wrap-in.mod-li-lay.chan-mgtp>div');
        async.parallel(
          {
            user: (cb) => {
              this.getUser(task);
              cb();
            },
            media: (cb) => {
              this.getVideoList(task, vidObj, () => {
                cb();
              });
            }
          },
          () => {
            callback();
          }
        );
      });
    } else {
      option.url = `http://pm.funshion.com/v5/media/episode?cl=iphone&id=${task.id}&si=0&uc=202&ve=3.2.9.2`;
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
          typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVideo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          callback();
          return;
        }
        if (Number(result.retcode) === 404) {
          typeErr = {type: 'data', err: `fengxing-result.retcode-${result.retcode}`, interface: 'getVideo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          callback();
          return;
        }
        this.getVidList(task);
        callback();
      });
    }
  }
  getVideoList(task, vidObj, callback) {
    let h = null,
      dataJson = null,
      startIndex = null,
      endIndex = null,
      length = null,
      content = null;
    const option = {};
    task.type = '视频号';
    h = vidObj.eq(0).find('a').attr('data-id');
    option.url = `http://www.fun.tv/vplay/c-${task.id}.h-${h}/`;
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideoList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      startIndex = result.indexOf('{"dvideos":');
      endIndex = result.indexOf(';window.shareInfo');
      if (startIndex === -1 || endIndex === -1) {
        typeErr = {type: 'data', err: 'fengxing-list-dom-error', interface: 'getVideoList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      dataJson = result.substring(startIndex, endIndex);
      try {
        dataJson = JSON.parse(dataJson);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVideoList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      length = dataJson.dvideos[0].videos.length;
      content = dataJson.dvideos[0].videos;
      task.h = h;
      task.total += length;
      this.getVideoInfo(task, content[0].videoid);
      this.getComment(task, content[0].videoid);
      callback();
    });
  }
  getVidList(task) {
    task.type = '原创';
    const option = {
      url: `http://pm.funshion.com/v5/media/episode?cl=iphone&id=${task.id}&si=0&uc=202&ve=3.2.9.2`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidList-非视频号', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidList-非视频号', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVidList-非视频号', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      const content = result.episodes;
      this.getVideoInfo(task, content[0].id);
      this.getCreatTime(task, content[0].id);
    });
  }
  getVideoInfo(task, vid) {
    const option = {};
    if (task.type === '视频号') {
      option.url = `http://pv.funshion.com/v5/video/profile?cl=iphone&id=${vid}&si=0&uc=202&ve=3.2.9.2`;
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
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVideoInfo-视频号', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          return;
        }
        if (!result) {
          typeErr = {type: 'data', err: 'fengxing-data-视频号-error', interface: 'getVideoInfo-视频号', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
      });
    } else {
      option.url = `http://www.fun.tv/vplay/g-${task.id}.v-${vid}/`;
      request.get(logger, option, (err, result) => {
        if (err) {
          if (err.status && err.status !== 200) {
            typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideoInfo-非视频号', url: option.url};
            infoCheck.interface(this.core, task, typeErr);
          } else {
            typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoInfo-非视频号', url: option.url};
            infoCheck.interface(this.core, task, typeErr);
          }
        }
      });
    }
  }
  getComment(task, vid) {
    const option = {
      url: `http://api1.fun.tv/comment/display/video/${vid}?pg=1&isajax=1`
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
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getCreatTime(task, vid) {
    const option = {
      url: `http://api1.fun.tv/ajax/new_playinfo/gallery/${vid}/?user=funshion&mid=${task.id}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getCreatTime', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getCreatTime', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getCreatTime', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;