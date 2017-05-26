/**
 * Created by zhupenghui on 17/5/17.
 */
const async = require('async');
const cheerio = require('cheerio');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

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
      url: `http://bolo.163.com/new/person?id=${task.id}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('用户主页请求失败', err);
        callback(err);
        return;
      }
      const $ = cheerio.load(result.body),
        fans_num = $('span.item.fans').text().replace('粉丝', ''),
        user = {
          bid: task.id,
          platform: task.p,
          fans_num
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
    const option = {};
    let cycle = true, page = 1;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.bolo.list}&userId=${task.id}&pageNum=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('视频列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('列表数据解析失败', result.body);
            cb();
            return;
          }
          if (!result || result.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result, () => {
            page += 1;
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
        this.getMedia(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getMedia(task, video, callback) {
    async.parallel(
      [
        (cb) => {
          this.getVideoInfo(video.videoId, (err, result) => {
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
          title: spiderUtils.stringHandling(video.title, 80) || 'btwk_caihongip',
          desc: spiderUtils.stringHandling(video.intro, 100),
          long_t: video.duration,
          play_num: video.playCount,
          a_create_time: parseInt(video.uploadTime / 1000, 10),
          v_img: video.cover,
          tag: result[0].tags,
          comment_num: result[0].commentCount,
          class: result[0].zoneName,
          support: result[0].favorCount
        };
        task.total += 1;
        logger.debug(media);
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        callback();
      }
    );
  }
  getVideoInfo(vid, callback) {
    const option = {
      url: `${this.settings.spiderAPI.bolo.videoInfo}${vid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频详情请求失败', err);
        callback(null, { tags: '', commentCount: '', zoneName: '', favorCount: '' });
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('视频详情解析失败', result.body);
        callback(null, { tags: '', commentCount: '', zoneName: '', favorCount: '' });
        return;
      }
      callback(null, result.videoInfo);
    });
  }
}
module.exports = dealWith;