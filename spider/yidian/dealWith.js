/**
 * Created by yunsong on 16/7/29.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const moment = require('moment');

let logger;
const _aid = (video) => {
  if (!video) {
    return null;
  }
  if (video.itemid && video.itemid !== 'video') {
    return video.itemid;
  }
  if (video.docid) {
    return video.docid;
  }
  return null;
};
const _vImg = (raw) => {
  if (!raw) {
    return null;
  }
  if (raw.image) {
    return raw.image;
  }
  if (raw.image_urls && raw.image_urls.length !== 0) {
    return raw.image_urls[0];
  }
  return null;
};
const _tag = (raw) => {
  if (!raw) {
    return null;
  }
  if (raw.keywords && raw.keywords.length !== 0) {
    return raw.keywords.join(',');
  }
  return null;
};
const _class = (raw) => {
  if (!raw) {
    return null;
  }
  if (!raw.vsct) {
    return null;
  }
  if (typeof raw.vsct === 'string') {
    return raw.vsct.replace(/\//g, ',');
  }
  if (Object.prototype.toString.call(raw.vsct) === '[object Array]' && raw.length !== 0) {
    return raw.vsct[0].replace(/vsct\/\//g, '').replace(/\//g, ',');
  }
  return null;
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
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb(null, '用户信息已返回');
          });
        },
        media: (cb) => {
          this.getInterestId(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '视频信息已返回');
          });
        }
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        logger.debug(`${task.id}_result:`, result);
        callback(null, task.total);
      }
    );
  }
  getUser(task, callback) {
    const option = {
      url: this.settings.spiderAPI.yidian.userInfo + task.id,
      ua: 3,
      own_ua: 'yidian/4.3.4.4 (iPhone; iOS 10.1.1; Scale/3.00)'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        callback(e);
        return;
      }
      if (result.status !== 'success') {
        callback(true);
        return;
      }
      const fansStr = result.result.channels[task.id].replace('人订阅', '');
      let fansNum;
      if (fansStr.indexOf('万') !== -1) {
        fansNum = fansStr.replace('万', '') * 10000;
      } else if (fansStr.indexOf('亿') !== -1) {
        fansNum = fansStr.replace('亿', '') * 100000000;
      } else {
        fansNum = Number(fansStr);
      }
      if (isNaN(fansNum)) {
        callback(true);
        return;
      }
      const user = {
        platform: 11,
        bid: task.id,
        fans_num: fansNum
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
    request.post(logger, option, (err, back) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`一点资讯用户 ${user.bid} json数据解析失败`);
        logger.error(back);
        callback(e);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('一点资讯用户:', `${user.bid} back_end`);
      } else {
        logger.error('一点资讯用户:', `${user.bid} back_error`);
        logger.error(back);
        logger.error('user info: ', user);
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
        logger.error('json数据解析失败');
        logger.error('send error:', result);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.error(result);
      }
    });
  }
  getInterestId(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.yidian.list}&path=channel|news-list-for-channel&channel_id=${task.id}&cstart=0&cend=10`,
      referer: `http://www.yidianzixun.com/home?page=channel&id=${task.id}`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err.message);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        callback(e.message);
        return;
      }
      if (result.status !== 'success') {
        if (result.code === 41) {
          spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
          callback();
          return;
        }
        callback(`code:${result.code},reason:${result.reason}`);
        return;
      }
      if (result.result.length === 0) {
        callback(true);
        return;
      }
      if (result.result[0].ctype === 'interest_navigation') {
        if (!result.result[0].columns || result.result[0].columns.length < 2) {
          callback(true);
          return;
        }
        task.interest_id = result.result[0].columns[1].interest_id;
        this.getList(task, 'video', () => callback());
      } else {
        this.getList(task, 'all', () => callback());
      }
    });
  }
  getList(task, type, callback) {
    let sign = true, cstart = 0, cend = 50;
    const option = {
      ua: 1
    };
    async.whilst(
      () => sign,
      (cb) => {
        if (type === 'video') {
          option.url = `${this.settings.spiderAPI.yidian.list}&path=channel|news-list-for-vertical&interest_id=${task.interest_id}&channel_id=${task.id}&cstart=${cstart}&cend=${cend}`;
        } else {
          option.url = `${this.settings.spiderAPI.yidian.list}&path=channel|news-list-for-channel&channel_id=${task.id}&cstart=${cstart}&cend=${cend}`;
        }
        option.referer = `http://www.yidianzixun.com/home?page=channel&id=${task.id}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            cstart += 50;
            cend += 50;
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            cb();
            return;
          }
          if (!result.result) {
            cb();
            return;
          }
          if (result.result.length === 0) {
            sign = false;
            task.total = cstart;
            cb();
            return;
          }
          if (result.code != 0) {
            cb();
            return;
          }
          this.deal(task, result.result, () => {
            cstart += 50;
            cend += 50;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  deal(task, list, callback) {
    let index = 0, video, media;
    const length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        video = list[index];
        if (video.ctype !== 'video_live') {
          index += 1;
          cb();
          return;
        }
        media = {
          author: task.name,
          platform: task.p,
          bid: task.id,
          aid: _aid(video),
          title: video.title ? video.title.substr(0, 100).replace(/"/g, '') : 'btwk_caihongip',
          desc: video.summary ? video.summary.substr(0, 100).replace(/"/g, '') : '',
          class: _class(video),
          tag: _tag(video),
          v_img: _vImg(video),
          long_t: video.duration ? Math.round(video.duration) : null,
          save_num: video.like ? video.like : 0,
          comment_num: video.comment_count ? video.comment_count : 0,
          support: video.up ? video.up : 0,
          step: video.down ? video.down : 0,
          a_create_time: moment(video.date).unix()
        };
        media = spiderUtils.deleteProperty(media);
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        index += 1;
        cb();
      },
      () => {
        callback();
      }
    );
  }
}
module.exports = dealWith;