/**
 * Created by zhupenghui on 17/6/30.
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
      url: `${this.settings.spiderAPI.douyin + task.id}`,
      ua: 3,
      own_ua: 'Aweme/1.4.6 (iPhone; iOS 10.3.2; Scale/3.00)'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('用户信息请求失败', err);
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
      if (result.status_code !== 0 || !result.user) {
        spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
        callback();
        return;
      }
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num: result.user.follower_count
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json'
      }
    };
    let cycle = true, cursor = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.douyin.list + task.id}&max_cursor=${cursor}`;
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
          if (!result || !result.aweme_list.length) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.aweme_list, () => {
            cursor = result.max_cursor;
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
    let index = 0, media, title, desc;
    const length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        title = list[index].cha_list[0] ? list[index].cha_list[0].cha_name : 'btwk_caihongip';
        desc = list[index].cha_list[0] ? list[index].cha_list[0].desc : '';
        media = {
          author: task.name,
          bid: task.id,
          platform: task.p,
          aid: list[index].statistics.aweme_id,
          title: spiderUtils.stringHandling(title, 80),
          desc: spiderUtils.stringHandling(desc, 100),
          play_num: list[index].statistics.play_count,
          a_create_time: list[index].create_time,
          v_img: list[index].video.cover.url_list[0],
          comment_num: list[index].statistics.comment_count,
          support: list[index].statistics.digg_count,
          forward_num: list[index].statistics.share_count,
          v_url: list[index].share_info.share_url
        };
        task.total += 1;
        logger.debug(media);
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