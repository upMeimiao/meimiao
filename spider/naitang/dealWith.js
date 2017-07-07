/**
 * Created by zhupenghui on 17/7/7.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const _playNum = (num) => {
  if (!num) {
    return null;
  }
  if (num.includes('.')) {
    return Number(num.replace('w', '000').replace(/./g, ''));
  }
  return Number(num.replace('w', '0000'));
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
      url: `${this.settings.spiderAPI.naitang.user + task.id}`,
      ua: 3,
      own_ua: 'Toffee/2.3.0 (iPhone; iOS 10.3.2; Scale/3.00)'
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
      if (Number(result.error) !== 0 || !result.data) {
        spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
        callback();
        return;
      }
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num: result.data.follower.count
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
        logger.error(`bolo ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('bolo:', `${user.bid} back_end`);
      } else {
        logger.error('bolo:', `${user.bid} back_error`);
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
      ua: 3,
      own_ua: 'Toffee/2.3.0 (iPhone; iOS 10.3.2; Scale/3.00)'
    };
    let cycle = true, start = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.naitang.list + task.id}&start=${start}`;
        request.get(logger, option, (err, result) => {
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
          if (Number(result.error) !== 0 || !result.data || !result.data.list.length) {
            cycle = false;
            cb();
            return;
          }
          task.total = task.total || result.data.total;
          this.deal(task, result.data.list, () => {
            start += 12;
            cb();
          });
        });
      },
      () => callback()
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
      () => callback()
    );
  }
  media(task, video, callback) {
    const media = {
      author: task.name,
      bid: task.id,
      platform: task.p,
      aid: video.id,
      title: spiderUtils.stringHandling(video.base.title, 80),
      desc: spiderUtils.stringHandling(video.share.desc, 100),
      play_num: _playNum(video.base.playcount),
      v_img: video.cover,
      class: video.topic.title,
      comment_num: video.comment.title,
      long_t: video.base.duration,
      v_url: video.share.url,
      support: video.like.title
    };
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    spiderUtils.commentSnapshots(this.core.taskDB,
      { p: media.platform, aid: media.aid, comment_num: media.comment_num });
    callback();
  }
}
module.exports = dealWith;