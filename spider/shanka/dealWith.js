/**
 * Created by zhupenghui on 17/7/5.
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
    this.getList(task, () => {
      callback(null, task.total);
    });
  }
  sendUser(user) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`shanka ${user.bid} json数据解析失败`);
        logger.info(result);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('shanka:', `${user.bid} back_end`);
      } else {
        logger.error('shanka:', `${user.bid} back_error`);
        logger.info(result);
        logger.info('user info: ', user);
      }
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
  getList(task, callback) {
    const option = {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      }
    };
    let cycle = true, info = '', user;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.shanka.list}{"attach_info":"${info}","type":"1","person_id":"${task.id}"}`;
        logger.debug(option.url);
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('用户信息请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('用户信息解析失败', result.body);
            cb();
            return;
          }
          if (Number(result.ret) !== 0 || !result.data || !result.data.feeds.length) {
            cycle = false;
            cb();
            return;
          }
          if (!task.total) {
            user = {
              bid: task.id,
              platform: task.p,
              fans_num: result.data.follower_num
            };
            task.total = result.data.feed_num;
            // this.sendUser(user);
            this.sendStagingUser(user);
          }
          this.deal(task, result.data.feeds, () => {
            info = result.data.attach_info.replace('"lastScore"', '\\"lastScore\\"').replace('\n', '');
            cb();
          });
        });
      },
      () => callback()
    );
  }
  deal(task, list, callback) {
    let index = 0, media;
    const length = list.length;
    // task.total += length;
    async.whilst(
      () => index < length,
      (cb) => {
        media = {
          author: task.name,
          bid: task.id,
          platform: task.p,
          aid: list[index].id,
          title: spiderUtils.stringHandling(list[index].share_info.body_map[0].title, 80),
          desc: spiderUtils.stringHandling(list[index].material_desc, 100),
          a_create_time: list[index].createtime,
          v_img: list[index].images[0].url,
          comment_num: list[index].total_comment_num,
          support: list[index].ding_count,
          v_url: list[index].share_info.jump_url,
          play_num: list[index].playNum
        };
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