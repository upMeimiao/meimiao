/**
 * Created by junhao on 16/6/20.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const jsonp = function (data) {
  return data;
};
const _time = (time) => {
  if (!time) {
    return '';
  }
  time = time.split(':');
  if (time.length === 2) {
    time = (time[0] * 60 * 60) + (time[1] * 60);
    return time;
  }
  if (time.length === 3) {
    time = (time[0] * 60 * 60) + (time[0] * 60) + Number(time[1]);
    return time;
  }
  return time;
};
const devArr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const getDevId = () => {
  let devId = '';
  for (let i = 0; i < 32; i += 1) {
    if (i < 7) {
      devId += devArr[Math.floor(Math.random() * 10)];
    } else {
      devId += devArr[Math.floor(Math.random() * 36)];
    }
    if (i === 7 || i === 11 || i === 15 || i === 19) {
      devId += '-';
    }
  }
  return devId;
};
const _class = (raw) => {
  if (typeof raw === 'string') {
    return raw;
  }
  if (Object.prototype.toString.call(raw) === '[object Array]') {
    return raw.join(',');
  }
  return '';
};
const _tag = (raw) => {
  const _tagArr = [];
  if (!raw) {
    return '';
  }
  if (Object.prototype.toString.call(raw) === '[object Array]' && raw.length !== 0) {
    for (const elem of raw.entries()) {
      _tagArr.push(elem[1].tag);
    }
    return _tagArr.join(',');
  }
  if (Object.prototype.toString.call(raw) === '[object Array]' && raw.length === 0) {
    return '';
  }
  if (typeof raw === 'object') {
    return raw.tag;
  }
  return '';
};
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.total = 0;
    task.devId = getDevId();
    async.parallel({
      user: (cb) => {
        this.getUser(task, () => {
          cb(null, '用户信息已返回');
        });
      },
      media: (cb) => {
        this.getVideos(task, (err) => {
          if (err) {
            cb(err);
            return;
          }
          cb(null, '视频信息已返回');
        });
      }
    }, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      logger.debug('result:', result);
      callback(null, task.total);
    });
  }
  getUser(task, callback) {
    const option = {
      url: this.settings.spiderAPI.kuaibao.user + task.id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json error:', result.body);
        callback();
        return;
      }
      if (result.ret === 1) {
        spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
        callback();
        return;
      }
      if (!result.channelInfo) {
        logger.error('userInfo异常错误');
        logger.error(result);
        callback();
        return;
      }
      const user = {
        platform: 10,
        bid: task.id,
        fans_num: result.channelInfo.subCount
      };
      this.sendUser(user, () => {
        callback();
      });
      this.sendStagingUser(user);
    });
  }
  sendUser(user, callback) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error(`返回天天快报用户 ${user.bid} 连接服务器失败`);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`天天快报用户 ${user.bid} json数据解析失败`);
        logger.error(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('天天快报用户:', `${user.bid} back_end`);
      } else {
        logger.error('天天快报用户:', `${user.bid} back_error`);
        logger.info(result);
        logger.info('user info: ', user);
      }
      callback();
    });
  }
  sendStagingUser(user) {
    const option = {
      url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
      data: user
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('send error:', result);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getVideos(task, callback) {
    const option = {
      url: this.settings.spiderAPI.kuaibao.video,
      referer: 'http://r.cnews.qq.com/inews/iphone/',
      data: {
        chlid: task.id,
        is_video: 1
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败', result);
        callback(e);
        return;
      }
      task.total = result.newslist.length;
      let idStr = '';
      for (const ids of result.ids) {
        idStr += `,${ids.id}`;
      }
      this.getVideoList(task, idStr.replace(',', ''), () => {
        callback();
      });
    });
  }
  getVideoList(task, idStr, callback) {
    const option = {
        url: this.settings.spiderAPI.kuaibao.list,
        referer: 'http://r.cnews.qq.com/inews/iphone/',
        data: {
          ids: idStr,
          is_video: 1
        }
      },
      videoArr = [];
    request.post(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败', result);
        callback(e);
        return;
      }
      for (const video of result.newslist) {
        videoArr.push({
          id: video.id,
          title: video.title,
          desc: video.video_channel.video.desc,
          vid: video.video_channel.video.vid,
          img: video.thumbnails_qqnews_photo[0],
          longt: video.video_channel.video.duration,
          createTime: video.timestamp,
          commentid: video.commentid,
          type: video.articletype
        });
      }
      for (const ids of videoArr) {
        for (const vid of result.videoHits) {
          if (ids.vid == vid.vid) {
            ids.playNum = vid.playcount;
          }
        }
      }
      result = null;
      this.deal(task, videoArr, () => {
        callback();
      });
    });
  }
  deal(task, list, callback) {
    let index = 0;
    const length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getDetail(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  // getInfo(task, video, callback) {
  //   const option = {
  //     referer: 'http://r.cnews.qq.com/inews/iphone/',
  //     url: this.settings.spiderAPI.kuaibao.list,
  //     data: {
  //       ids: video.id
  //     }
  //   };
  //   request.post(logger, option, (err, result) => {
  //     if (err) {
  //       logger.error('occur error : ', err);
  //       callback(err);
  //       return;
  //     }
  //     try {
  //       result = JSON.parse(result.body);
  //     } catch (e) {
  //       logger.error('json数据解析失败');
  //       logger.info(result);
  //       callback(e);
  //       return;
  //     }
  //     if (result.newslist.length === 0) {
  //       callback();
  //       return;
  //     }
  //     const backData = result.newslist[0],
  //       info = {
  //         id: backData.id,
  //         author: backData.chlname,
  //         type: backData.articletype,
  //         commentId: backData.commentid,
  //         title: backData.title,
  //         time: backData.timestamp,
  //         vid: backData.video_channel.video.vid
  //       };
  //     this.getDetail(task, info, (error) => {
  //       if (error) {
  //         callback(error);
  //         return;
  //       }
  //       callback();
  //     });
  //   });
  // }
  getDetail(task, info, callback) {
    async.parallel({
      comment: (cb) => {
        this.getCommentNum(info, (err, num) => {
          if (err) {
            cb(err);
            return;
          }
          cb(null, num);
        });
      },
      expr: (cb) => {
        this.getExpr(info, (err, data) => {
          if (err) {
            cb(err);
            return;
          }
          cb(null, data);
        });
      },
      // play: (cb) => {
      //   this.getPlayNum(task, info, (err, num) => {
      //     if (err) {
      //       cb(err);
      //       return;
      //     }
      //     cb(null, num);
      //   });
      // },
      newField: (cb) => {
        this.getField(info, (err, data) => {
          if (err) {
            cb(err);
            return;
          }
          cb(null, data);
        });
      }
    }, (err, results) => {
      if (err) {
        callback(err);
        return;
      }
      let media = {
        author: task.name,
        platform: task.p,
        bid: task.id,
        aid: info.id,
        title: info.title.substr(0, 100).replace(/"/g, ''),
        play_num: info.playNum,
        comment_num: Number(results.comment),
        support: results.expr.up,
        step: results.expr.down,
        save_num: results.expr.like,
        a_create_time: info.createTime,
        long_t: _time(info.longt),
        v_img: info.img,
        tag: results.newField ? results.newField.tag : null,
        class: results.newField ? results.newField.class : null
      };
      media = spiderUtils.deleteProperty(media);
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
  getCommentNum(info, callback) {
    const option = {
      url: this.settings.spiderAPI.kuaibao.comment,
      referer: 'http://r.cnews.qq.com/inews/iphone/',
      data: {
        chlid: 'media_article',
        comment_id: info.commentid,
        c_type: 'comment',
        article_id: info.id,
        page: 1
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      if (result.comments && result.comments.count) {
        callback(null, result.comments.count);
      } else {
        callback(null, 0);
      }
    });
  }
  getExpr(info, callback) {
    const option = {
      url: this.settings.spiderAPI.kuaibao.expr,
      referer: 'http://r.cnews.qq.com/inews/iphone/',
      data: {
        id: info.id,
        chlid: 'media_article'
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      const data = {
        like: result.like_info.count,
        up: result.expr_info.list[0].count || null,
        down: result.expr_info.list[1].count || null
      };
      callback(null, data);
    });
  }
  getPlayNum(task, info, callback) {
    const option = {
      url: `${this.settings.spiderAPI.kuaibao.play}&devid=${task.devId}`,
      referer: 'http://r.cnews.qq.com/inews/iphone/',
      data: {
        id: info.id,
        chlid: 'media_video',
        articletype: info.type
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      if (result.kankaninfo &&
        (result.kankaninfo.videoInfo || result.kankaninfo.videoInfo === 0)) {
        callback(null, result.kankaninfo.videoInfo.playcount);
      } else {
        callback(true);
      }
    });
  }
  getField(info, callback) {
    const option = {
      url: `http://ncgi.video.qq.com/tvideo/fcgi-bin/vp_iphone?vid=${info.vid}&plat=5&pver=0&otype=json&callback=jsonp`,
      referer: 'http://r.cnews.qq.com/inews/iphone/'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(null, { tag: '', class: '' });
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('jsonp数据解析失败');
        logger.error(result);
        callback(null, { tag: '', class: '' });
        return;
      }
      if (!result.video) {
        callback(null, null);
        return;
      }
      const backData = {
        tag: _tag(result.video.tags),
        class: _class(result.video.ctypename)
      };
      callback(null, backData);
    });
  }
}
module.exports = dealWith;