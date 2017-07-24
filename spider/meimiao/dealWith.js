/**
 * Created by zhupenghui on 17/5/17.
 */
const async = require('neo-async');
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
    this.getVideoList(task, () => {
      callback(null, task.total);
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
    let cycle = true, page = 1, user;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.meimiao.list + task.id}&page=${page}&_=${new Date().getTime()}`;
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
          if (Number(result.code) !== 0 || !result.data.publisherDetail.imageText.length) {
            cycle = false;
            cb();
            return;
          }
          if (!task.total) {
            task.total = result.data.publisherDetail.total;
            user = {
              bid: task.id,
              platform: task.p,
              fans_num: result.data.publisherDetail.subscribe_num
            };
            // this.sendUser(user);
            this.sendStagingUser(user);
          }
          this.deal(task, result.data.publisherDetail.imageText, () => {
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
          this.getVideoInfo(video.id, (err, result) => {
            cb(null, result);
          });
        },
        (cb) => {
          this.comment(video, (err, num) => {
            cb(null, num);
          });
        }

      ],
      (err, result) => {
        const media = {
          author: task.name,
          bid: task.id,
          platform: task.p,
          aid: video.id,
          title: spiderUtils.stringHandling(video.title, 80) || 'btwk_caihongip',
          desc: spiderUtils.stringHandling(video.subhead, 100),
          long_t: spiderUtils.longTime(video.length),
          a_create_time: video.update_time,
          v_img: video.image,
          tag: result[0],
          comment_num: result[1],
          upport: video.praise_num
        };
        // logger.debug(media);
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getVideoInfo(vid, callback) {
    const option = {
      url: `https://m-v.gomeplus.com/v/${vid}.html`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频详情请求失败', err);
        callback(null, '');
        return;
      }
      const $ = cheerio.load(result.body),
        tags = $('div.tag>div.clearfix>a.btn-text');
      let tag = '';
      for (let i = 0; i < tags.length; i += 1) {
        tag += `,${tags.eq(i).text()}`;
      }
      callback(null, tag.replace(',', ''));
    });
  }
  comment(video, callback) {
    const option = {
      url: `${this.settings.spiderAPI.meimiao.comment}&topic_id=${video.id}`,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
      }
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论请求出错', err);
        callback(null, '');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论解析失败', result.body);
        callback(null, '');
        return;
      }
      if (Number(result.code) !== 200) {
        callback(null, '');
        return;
      }
      callback(null, result.data.total);
    });
  }
}
module.exports = dealWith;