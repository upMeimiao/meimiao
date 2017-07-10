/**
 * Created by zhupenghui on 17/7/7.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const cookieStr = () => {
  const str = 'qwertyuiopasdfghjklzxcvbnm0123456789';
  let cookie = '';
  for (let i = 0; i < 39; i += 1) {
    cookie += str.charAt(Math.floor(Math.random() * str.length));
  }
  return `wjgl_device_id=${cookie};`;
};
let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.total = 0;
    task.cookie = cookieStr();
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '粉丝数返回');
          });
        },
        media: (cb) => {
          this.getVideoList(task, () => {
            cb(null, '视频信息返回');
          });
        }
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        logger.debug('result: ', result);
        callback(null, task.total);
      }
    );
  }
  getUser(task, callback) {
    const option = {
      url: this.settings.spiderAPI.youliao.user + task.id,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'X-Requested-With'
      }
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('用户信息请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('用户信息解析失败', result.body);
        callback(e);
        return;
      }
      if (!result || !result.userId) {
        spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
        callback();
        return;
      }
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num: result.userFansCount
      };
      // this.sendUser(user, () => {
      //   callback();
      // });
      this.sendStagingUser(user);
      callback();
    });
  }
  sendUser(user, callback) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`线上: ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('线上:', `${user.bid} back_end`);
      } else {
        logger.error('线上:', `${user.bid} back_error`);
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
        logger.error('json数据解析失败');
        logger.info('send error:', result);
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
  getVideoList(task, callback) {
    const option = {
      url: this.settings.spiderAPI.youliao.list,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'X-Requested-With',
        cookie: task.cookie
      },
      data: {
        category: 'followFeed',
        orderBy: 'desc',
        pageSize: 20,
        userId: task.id
      }
    };
    let cycle = true, key = '';
    async.whilst(
      () => cycle,
      (cb) => {
        option.data.startKey = key;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.error('视频列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('列表数据解析失败', result.body);
            cb();
            return;
          }
          if (!result.data || Object.prototype.toString.call(result.data) !== '[object Array]' || !result.data.length) {
            cycle = false;
            cb();
            return;
          }
          task.total = task.total || result.count;
          this.deal(task, result.data, () => {
            key = result.data[result.data.length - 1].rowkey;
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
    let index = 0;
    const length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.media(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  media(task, video, callback) {
    async.parallel(
      [
        (cb) => {
          this.comment(task, video.gcid, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        const media = {
          author: task.name,
          bid: task.id,
          platform: task.p,
          aid: video.videoId,
          title: spiderUtils.stringHandling(video.audioTitle, 80),
          play_num: video.playNum,
          a_create_time: parseInt(video.createTime / 1000, 10),
          v_img: video.vframeUrl,
          support: video.praiseNum,
          comment_num: result[0],
          long_t: video.length,
          v_url: `http://wjgl.xlmc.xunlei.com/video/share?videoId=${video.videoId}&hmsr=youliaoios&newRec=true`,
          forward_num: video.shareNum
        };
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        // logger.info(media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  comment(task, cid, callback) {
    const option = {
      url: this.settings.spiderAPI.youliao.comment,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'X-Requested-With',
        cookie: task.cookie
      },
      data: {
        tid: cid,
        typeId: 1,
        lastId: '',
        type: 'loadmore',
        pageSize: 20,
        category: 'new'
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('commentNum 请求失败', err);
        callback(null, '');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('comment解析失败', result.body);
        callback(null, '');
        return;
      }
      callback(null, result.rcount);
    });
  }
}
module.exports = dealWith;