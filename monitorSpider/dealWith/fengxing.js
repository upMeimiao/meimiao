/**
 * Created by zhupenghui on 17/6/22.
 */

let logger, typeErr, async, cheerio, request, infoCheck;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    async = core.modules.async;
    cheerio = core.modules.cheerio;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    logger = this.settings.logger;
    logger.trace('fengxing monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.timeout = 0;
    this.getVideo(task, () => {
      callback();
    });
  }
  getUser(task) {
    let name = encodeURIComponent(task.name),
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
      let $ = cheerio.load(result.body),
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
        typeErr = {type: 'data', err: `fengxing-dom-fans-error, data: ${JSON.stringify(user)}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      name = null; option = null; $ = null; list =null ; user = null;
    });
  }
  getVideo(task, callback) {
    let option = {};
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
        let $ = cheerio.load(result.body),
          vidObj = $('div.mod-wrap-in.mod-li-lay.chan-mgtp>div');
        if (!vidObj.length) {
          typeErr = {type: 'data', err: `fengxing-video-dom-结构异常, data: ${vidObj.length}`, interface: 'getVideo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          return;
        }
        async.parallel(
          {
            user: (cb) => {
              this.getUser(task);
              cb();
            },
            media: (cb) => {
              this.getVideoList(task, vidObj);
              cb();
            }
          },
          () => {
            option = null; $ = null; vidObj = null; result = null;
            callback();
          }
        );
      });
      return;
    }
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
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'getVideo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (Number(result.retcode) === 404) {
        typeErr = {type: 'data', err: `fengxing-result.retcode-${JSON.stringify(result)}`, interface: 'getVideo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      this.getVidList(task);
      result = null; option = null;
      callback();
    });
  }
  getVideoList(task, vidObj) {
    let h = null,
      dataJson = null,
      startIndex = null,
      endIndex = null,
      length = null,
      content = null,
      option = {};
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
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      startIndex = result.indexOf('{"dvideos":');
      endIndex = result.indexOf(';window.shareInfo');
      if (startIndex === -1 || endIndex === -1) {
        typeErr = {type: 'data', err: 'fengxing-list-dom-error', interface: 'getVideoList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      dataJson = result.substring(startIndex, endIndex);
      try {
        dataJson = JSON.parse(dataJson);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${dataJson}`, interface: 'getVideoList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!dataJson || !dataJson.dvideos.length) {
        typeErr = {type: 'data', err: `fengxing-视频号视频列表-数据异常, data: ${JSON.stringify(dataJson)}`, interface: 'getVideoList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      length = dataJson.dvideos[0].videos.length;
      content = dataJson.dvideos[0].videos;
      task.h = h;
      task.total += length;
      this.getVideoInfo(task, content[0].videoid);
      this.getComment(task, content[0].videoid);
      vidObj = null; option = null; result = null; content = null; dataJson = null;
    });
  }
  getVidList(task) {
    task.type = '原创';
    let option = {
      url: `http://pm.funshion.com/v5/media/episode?cl=iphone&id=${task.id}&si=0&uc=202&ve=3.2.9.2`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidList-原创', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidList-原创', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'getVidList-原创', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result ||!result.episodes.length) {
        typeErr = {type: 'data', err: `fengxing-原创-视频列表数据异常, data: ${JSON.stringify(result)}`, interface: 'getVidList-原创', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      let content = result.episodes;
      this.getVideoInfo(task, content[0].id);
      this.getCreatTime(task, content[0].id);
      option = null; result = null; content = null;
    });
  }
  getVideoInfo(task, vid) {
    let option = {};
    if (task.id.toString().length < 6) {
      option.url = `http://pv.funshion.com/v5/video/profile?cl=iphone&id=${vid}&si=0&uc=202&ve=3.2.9.2`;
      request.get(logger, option, (err, result) => {
        if (err) {
          if (err.status && err.status !== 200) {
            typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideoInfo-视频号', url: option.url};
            infoCheck.interface(this.core, task, typeErr);
          } else {
            typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoInfo-视频号', url: option.url};
            infoCheck.interface(this.core, task, typeErr);
          }
          return;
        }
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'getVideoInfo-视频号', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          return;
        }
        if (!result) {
          typeErr = {type: 'data', err: `fengxing-data-视频号-视频详情异常, data: ${JSON.stringify(result)}`, interface: 'getVideoInfo-视频号', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        option = null; result = null;
      });
      return;
    }
    option.url = `http://www.fun.tv/vplay/g-${task.id}.v-${vid}/`;
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          console.log('123123123');
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideoInfo-原创', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoInfo-原创', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      const $ = cheerio.load(result.body),
        vidClass = $('div.crumbsline a');
      if (!vidClass.length) {
        typeErr = {type: 'data', err: `fengxing-原创-视频详情页DOM结构异常, data: ${JSON.stringify(vidClass.length)}`, interface: 'getVideoInfo-原创', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getComment(task, vid) {
    let option = {
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
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: `fengxing-comment-数据异常, data: ${JSON.stringify(result)}`, interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getCreatTime(task, vid) {
    let option = {
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
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(err.message)}, data: ${result.body}`, interface: 'getCreatTime', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: `fengxing-发布时间-数据异常, data: ${JSON.stringify(result)}`, interface: 'getCreatTime', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
}
module.exports = dealWith;