/**
 * Created by zhupenghui on 17/7/7.
 */
const zlib = require('zlib');
const async = require('neo-async');
const req = require('request');
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
      url: `${this.settings.spiderAPI.muse.user + task.id}`,
      referer: `https://share.musemuse.cn/h5/share/usr/${task.id}.html`,
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
      if (!result.result) {
        spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
        callback();
        return;
      }
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num: result.result.fansNum
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
      headers: {
        'User-Agent': 'Musical.ly/20170625003 (iPhone; iOS 10.3.2; Scale/2.00)',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    let cycle = true, page = 1;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.muse.list + task.id}&anchor=${page}`;
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
          if (Number(result.code) !== 0 || !result.data.length) {
            cycle = false;
            cb();
            return;
          }
          task.total = task.total || result.total;
          this.deal(task, result.data, () => {
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
          this.videoInfo(video.id, (err, result) => {
            cb(null, result);
          });
        },
        (cb) => {
          this.comment(video.id, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        const media = {
          author: task.name,
          bid: task.id,
          platform: task.p,
          aid: video.id,
          title: spiderUtils.stringHandling(video.title, 80),
          desc: spiderUtils.stringHandling(video.adwords, 100),
          play_num: video.click,
          a_create_time: video.saveTime,
          v_img: video['800fix'],
          class: video.appName,
          comment_num: result[1],
          long_t: result[0],
          v_url: video.url
        };
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  videoInfo(vid, callback) {
    const option = {
      method: 'GET',
      url: `${this.settings.spiderAPI.aipai.video + vid}_os-2.html`,
      encoding: null,
      headers: {
        'User-Agent': 'Aipai/342 (iPhone; iOS 10.3.2; Scale/3.0) aipai/iOS/aipai/aipai/v(342)'
      }
    };
    req(option, (error, response, body) => {
      if (error) {
        logger.error('视频详情请求错误', error);
        callback(null, '');
        return;
      }
      if (response.statusCode !== 200) {
        logger.error('视频详情请求状态码错误', response.statusCode);
        callback(null, '');
        return;
      }
      if (response.headers['content-encoding'] && response.headers['content-encoding'].toLowerCase().includes('gzip')) {
        body = zlib.unzipSync(body);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error('视频详情解析失败', body.toString());
        callback(null, '');
        return;
      }
      if (Number(body.code) !== 0 || !body.data || !body.data.assetInfo) {
        callback(null, '');
        return;
      }
      callback(null, body.data.assetInfo.totalTime);
    });
  }
  comment(vid, callback) {
    const option = {
      url: `${this.settings.spiderAPI.aipai.comment + vid}.html`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
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
      callback(null, result.total);
    });
  }
}
module.exports = dealWith;