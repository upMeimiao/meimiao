/**
 * Created by yunsong on 16/8/4.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const longT = (raw) => {
  if (!raw) {
    return '';
  }
  return Math.round(raw);
};
const _vImg = (raw) => {
  if (!raw) {
    return '';
  }
  if (!raw.large_cover && !raw.medium_cover) {
    return '';
  }
  if (raw.large_cover.url_list && raw.large_cover.url_list.length > 0) {
    return raw.large_cover.url_list[0].url;
  }
  if (raw.medium_cover.url_list && raw.medium_cover.url_list.length > 0) {
    return raw.medium_cover.url_list[0].url;
  }
  return '';
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
    async.parallel({
      user: (cb) => {
        this.getUser(task, () => {
          cb(null, '用户信息已返回');
        });
      },
      media: (cb) => {
        this.getList(task, (err) => {
          if (err) {
            cb(err);
            return;
          }
          cb(null, '视频信息已返回');
        });
      }
    }, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      logger.debug('result : ', result);
      callback(null, task.total);
    });
  }
  getUser(task, callback) {
    const option = {
      url: this.settings.spiderAPI.neihan.userInfo + task.id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('json error :', result.body);
        callback();
        return;
      }
      const user = {
        platform: 19,
        bid: task.id,
        fans_num: result.data.followers
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
        logger.error('occur error : ', err);
        logger.info(`返回内涵段子用户 ${user.bid} 连接服务器失败`);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`内涵段子用户 ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('内涵段子用户:', `${user.bid} back_end`);
      } else {
        logger.error('内涵段子用户:', `${user.bid} back_error`);
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
        logger.error('occur error : ', err);
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
    const option = {};
    let sign = 1,
      isSign = true,
      time;
    async.whilst(
      () => isSign,
      (cb) => {
        logger.debug(`开始获取第${sign}页视频列表`);
        if (!time) {
          option.url = `${this.settings.spiderAPI.neihan.medialist + task.id}&min_time=0`;
        } else {
          option.url = `${this.settings.spiderAPI.neihan.medialist + task.id}&max_time=${time}`;
        }
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error(`occur error : ${err}`);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.error('json error: ', result.body);
            logger.error(sign);
            sign += 1;
            cb();
            return;
          }
          const list = result.data.data;
          if (list.length !== 0) {
            this.deal(task, list, () => {
              time = list[list.length - 1].group ?
                list[list.length - 1].group.online_time : list[list.length - 1].online_time;
              sign += 1;
              cb();
            });
          } else {
            task.total = sign * 20;
            isSign = false;
            cb();
          }
        });
      },
      () => {
        callback();
      }
    );
  }
  deal(task, list, callback) {
    let index = 0;
    async.whilst(
      () => index < list.length,
      (cb) => {
        if (!list[index].group) {
          index += 1;
          cb();
          return;
        }
        const group = list[index].group;
        if (!group) {
          index += 1;
          cb();
          return;
        }
        const type = group.media_type;
        if (Number(type) === 3) {
          this.getInfo(task, list[index], () => {
            index += 1;
            cb();
          });
        } else {
          index += 1;
          cb();
        }
      },
      () => {
        callback();
      }
  );
  }
  getInfo(task, data, callback) {
    const group = data.group;
    let title;
    if (group.title !== '') {
      title = group.title;
    } else {
      title = 'btwk_caihongip';
    }
    let media = {
      author: group.user.name,
      platform: 19,
      bid: task.id,
      aid: group.id_str,
      title: title.substr(0, 100).replace(/"/g, ''),
      desc: group.text.substr(0, 100).replace(/"/g, ''),
      play_num: group.play_count,
      save_num: group.favorite_count,
      forward_num: group.share_count,
      comment_num: group.comment_count,
      support: group.digg_count,
      step: group.bury_count,
      a_create_time: group.create_time,
      v_img: _vImg(group),
      long_t: group.duration ? longT(group.duration) : null,
      class: group.category_name
    };
    media = spiderUtils.deleteProperty(media);
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    spiderUtils.commentSnapshots(this.core.taskDB,
      { p: media.platform, aid: media.aid, comment_num: media.comment_num });
    callback();
  }
}
module.exports = dealWith;