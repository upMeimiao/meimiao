/**
 * Created by zhupenghui on 17/7/3.
 */
const async = require('neo-async');
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
      url: `${this.settings.spiderAPI.jd.user + new Date().getTime()}&body={"authorId":"${task.id}"}`,
      ua: 2
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
      if (!result || !result.data) {
        spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
        callback();
        return;
      }
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num: result.data.followNums
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
      ua: 2
    };
    let cycle = true, page = 1;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.jd.list + new Date().getTime()}&body={"authorId":"${task.id}","page":${page},"pagesize":20,"type":1}`;
        // logger.debug(option.url);
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
          if (!result.page || !result.page.content.length) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.page.content, () => {
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
        if (Number(list[index].videoFlag) === 0) {
          index += 1;
          cb();
          return;
        }
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
          this.videoInfo(video.articleId, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        if (!result[0]) {
          callback();
          return;
        }
        const media = {
          author: task.name,
          bid: task.id,
          platform: task.p,
          aid: video.articleId,
          title: spiderUtils.stringHandling(video.title, 80),
          play_num: video.pageView,
          a_create_time: parseInt(video.publishTime / 1000, 10),
          v_img: video.indexImage,
          class: result[0].class,
          comment_num: result[0].comment,
          long_t: result[0].long_t,
          v_url: `https://h5.m.jd.com/active/faxian/html/innerpage.html?id=${video.articleId}`,
          tag: video.tags,
          support: result[0].like
        };
        task.total += 1;
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        // logger.info(media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  videoInfo(vid, callback) {
    const option = {
      url: `${this.settings.spiderAPI.jd.video + new Date().getTime()}&body={"id":"${vid}"}`,
      ua: 2
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        logger.error('视频详情请求错误', error);
        callback(null, '');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('视频详情解析失败', result.body);
        callback(null, '');
        return;
      }
      if (!result.data) {
        callback(null, '');
        return;
      }
      const info = {
        class: result.data.typeName,
        like: result.data.likeNumStr,
        comment: result.data.commentNumStr,
        long_t: result.data.description.length ? result.data.description[0].content.videoDuration : ''
      };
      callback(null, info);
    });
  }
}
module.exports = dealWith;