/**
 * Created by junhao on 16/6/20.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const jsonp = (data) => data;
const _time = (time) => {
  if (!time) {
    return '';
  }
  time = time.split(':');
  if (time.length === 2) {
    time = Number(time[0] * 60) + Number(time[1]);
    return time;
  }
  if (time.length === 3) {
    time = Number(time[0] * 60 * 60) + Number(time[0] * 60) + Number(time[1]);
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
const _tag = (raw) => {
  const _tagArr = [];
  if (!raw) {
    return '';
  }
  if (!raw.videoInfo) {
    return '';
  }
  raw = raw.videoInfo.tags || '';
  if (Object.prototype.toString.call(raw) === '[object Array]' && raw.length !== 0) {
    for (const elem of raw) {
      _tagArr.push(elem.name);
    }
    return _tagArr.join(',');
  }
  if (Object.prototype.toString.call(raw) === '[object Array]' && raw.length === 0) {
    return '';
  }
  return '';
};
const _cookie = () => {
  const str = '123456789';
  let cookie = 'phone_id=;%20luin=o142';
  for (let i = 0, j = 7; i < j; i += 1) {
    cookie += Math.ceil(Math.random() * str.length);
  }
  return cookie;
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
    task.cookie = _cookie();
    // console.log(task.cookie);
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
      // task.total = result.newslist.length;
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
        headers: {
          cookie: task.cookie,
          referer: 'http//r.cnews.qq.com/inews/iphone/',
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': '\\u5929\\u5929\\u5feb\\u62a5\\u0020 2.8.0 qnreading (iPhone; iOS 10.3.3; zh_CN; 2.8.0.11)' },
        data: {
          ids: idStr,
          is_video: '1' }
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
        if (video.video_channel) {
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
      }
      for (const ids of videoArr) {
        for (const vid of result.videoHits) {
          if (ids.vid == vid.vid) {
            ids.playNum = vid.playcount;
          }
        }
      }
      result = null;
      task.total = videoArr.length;
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
      videoInfo: (cb) => {
        this.videoInfo(info, (err, num) => {
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
        comment_num: results.videoInfo.commentNum,
        support: results.expr.up,
        step: results.expr.down,
        save_num: results.expr.like,
        a_create_time: info.createTime,
        long_t: _time(info.longt),
        v_img: info.img,
        tag: results.videoInfo.tag || ''
      };
      media = spiderUtils.deleteProperty(media);
      // logger.debug(media);
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
  videoInfo(info, callback) {
    const option = {
      url: this.settings.spiderAPI.kuaibao.videoInfo,
      headers: {
        Host: 'r.cnews.qq.com',
        mac: '020000000000',
        deviceToken: '<3974bb04 ceb38ada 1b112517 33e04962 c93a1039 4d661ce1 92ae4227 4d1ae769>',
        'qn-rid': '1f3058de4b3b',
        'qn-sig': 'B7363F31352D9CF98A1E9F2914F5B533',
        'User-Agent': '%e5%a4%a9%e5%a4%a9%e5%bf%ab%e6%8a%a5 2.8.0 qnreading (iPhone; iOS 10.3.3; zh_CN; 2.8.0.11)',
        Referer: 'http://r.cnews.qq.com/inews/iphone/',
        '--qnr': '1f3058de1a30',
        'Content-Type': 'application/x-www-form-urlencoded',
        appver: '10.3.3_qnreading_2.8.0',
        appversion: '2.8.0',
        apptypeExt: 'qnreading',
        devid: '34F1E7F9-270C-473F-B1F4-454EEE21B9D9',
        'keep-alive': 'iPhone8,2',
        apptype: 'ios'
      },
      data: {
        chlid: 'media_video',
        id: info.id
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('视频信息请求失败', err);
        callback(null, {});
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('视频信息解析失败', result.body);
        callback(null, {});
        return;
      }
      const res = {
        commentNum: result.kankaninfo ? result.kankaninfo.videoInfo.cmtnum : '',
        tag: _tag(result.kankaninfo || null)
      };
      callback(null, res);
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
        logger.error('json数据解析失败', result);
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
}
module.exports = dealWith;