/**
 * Created by zhupenghui on 17/5/23.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');

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
    task.timeout = 0;
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
          this.getVideoList(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
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
      url: `${this.settings.spiderAPI.huoshan.user}${task.id}`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('用户主页请求失败', err);
        callback(err);
        return;
      }
      result = result.body.replace(/[\n\s\r]/g, '');
      const fans = result.match(/"stats":{"follower_count":(\d*)/)[1],
        user = {
          bid: task.id,
          platform: task.p,
          fans_num: fans
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
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`火山小视频 ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('火山小视频:', `${user.bid} back_end`);
      } else {
        logger.error('火山小视频:', `${user.bid} back_error`);
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
    let cycle = true, offset = 0, maxTime = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.huoshan.list}offset=${offset}&count=21&user_id=${task.id}&max_time=${maxTime}`;
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
          if (!result.data.items || result.data.items.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.data.items, () => {
            offset += 21;
            maxTime = result.extra.max_time;
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
          this.getVideoInfo(task, video.id, (err, result) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, result);
          });
        },
        (cb) => {
          this.getComment(video.id, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        if (err) {
          if (err !== 'next' && task.timeout >= 3) {
            callback(err);
            return;
          }
          callback();
          return;
        }
        const media = {
          author: task.name,
          bid: task.id,
          platform: task.p,
          aid: video.id,
          title: spiderUtils.stringHandling(result[0].title, 80) || 'btwk_caihongip',
          long_t: Math.round(video.video.duration),
          play_num: result[0].play_num,
          a_create_time: result[0].create_time,
          v_img: video.video.cover.url_list[0],
          comment_num: result[1],
          support: result[0].support,
          forward_num: result[0].forward_num
        };
        task.total += 1;
        // logger.debug(media);
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getVideoInfo(task, vid, callback) {
    const option = {
      url: this.settings.spiderAPI.huoshan.video + vid,
      ua: 2
    };
    let res;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('视频详情请求失败', err);
        if (err.status !== 200) {
          callback('next');
          return;
        }
        this.getVideoInfo(task, vid, callback);
        return;
      }
      const _$ = cheerio.load(result.body),
        script = _$('script').eq(15).html();
      let dataJson = null, startIndex = null, lastIndex = null;
      if (!script) {
        dataJson = _$('script').eq(14).html().replace(/[\n\r\s]/g, '');
        startIndex = dataJson.indexOf('data:{');
        lastIndex = dataJson.indexOf(',req_id:');
        result = dataJson.substring(startIndex + 5, lastIndex);
      } else {
        startIndex = script.indexOf('var data = ');
        lastIndex = script.indexOf('};');
        result = script.substring(startIndex + 11, lastIndex + 1);
      }
      if (startIndex === -1 || lastIndex === -1) {
        callback('next');
        return;
      }
      try {
        result = JSON.parse(result);
      } catch (e) {
        logger.error('单个视频解析失败', result);
        callback('next');
        return;
      }
      res = {
        create_time: result.create_time,
        title: result.text || '',
        support: result.stats.digg_count,
        play_num: result.stats.play_count,
        comment_num: result.stats.comment_count,
        forward_num: result.stats.share_count
      };
      callback(null, res);
    });
  }
  getComment(aid, callback) {
    const option = {
      url: `https://api.huoshan.com/hotsoon/item/${aid}/comments/?aid=1112&os_version=10.3.1&app_name=live_stream&device_type=iPhone8,2&version_code=2.1.0&count=20&offset=0`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        callback(null, '');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论列表解析失败', result.body);
        callback(null, '');
        return;
      }
      callback(null, result.extra.total);
    });
  }
}
module.exports = dealWith;