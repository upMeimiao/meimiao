/**
 * Created by yunsong on 16/8/3.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const moment = require('moment');
const newRequest = require('request');

function longT(time) {
  const timeArr = time.split(':');
  let longt = '';
  if (timeArr.length === 2) {
    longt = moment.duration(`00:${time}`).asSeconds();
  } else if (timeArr.length === 3) {
    longt = moment.duration(time).asSeconds();
  }
  return longt;
}
function Tag(tag) {
  if (!tag) {
    return '';
  }
  const startIndex = tag.indexOf('#'),
    endIndex = tag.lastIndexOf('#');
  if (startIndex === -1) {
    return '';
  }
  tag = tag.substring(startIndex, endIndex + 1);
  return tag;
}
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
    this.getTotal(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }
  getTotal(task, callback) {
    logger.debug('开始获取视频总数');
    const option = {
      ua: 1,
      url: `${this.settings.spiderAPI.xiaoying.userInfo + task.id}&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('json error :', result.body);
        callback(e);
        return;
      }
      const user = {
        platform: 17,
        bid: task.id,
        fans_num: result.user.fanscount
      };
      task.total = result.user.videocount;
      async.parallel({
        user: (cb) => {
          this.sendUser(user, () => {
            cb(null, '用户信息已返回');
          });
          this.sendStagingUser(user);
        },
        media: (cb) => {
          this.getList(task, result.user.videocount, (error) => {
            if (error) {
              cb(error);
              return;
            }
            cb(null, '视频信息已返回');
          });
        }
      }, (error, res) => {
        if (error) {
          callback(error);
          return;
        }
        logger.debug('result : ', res);
        callback();
      });
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
        logger.info(`返回小影用户 ${user.bid} 连接服务器失败`);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`小影用户 ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (result.errno == 0) {
        logger.debug('小影用户:', `${user.bid} back_end`);
      } else {
        logger.error('小影用户:', `${user.bid} back_error`);
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
      if (result.errno == 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getList(task, total, callback) {
    const page = total % 30 === 0 ? total / 30 : Math.ceil(total / 30);
    let sign = 1;
    const options = {
      ua: 2
    };
    async.whilst(
      () => sign <= page,
      (cb) => {
        logger.debug(`开始获取第${sign}页视频列表`);
        options.url = `${this.settings.spiderAPI.xiaoying.list + task.id}&pageindex=${sign}&_=${new Date().getTime()}`;
        request.get(logger, options, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            callback(err);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info(result);
            callback(e);
            return;
          }
          const list = result.videolist;
          if (list) {
            this.deal(task, list, () => {
              sign += 1;
              cb();
            });
          } else {
            sign += 1;
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
        this.getInfo(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getInfo(task, data, callback) {
    const time = data.publishtime,
      a_create_time = moment(time, ['YYYYMMDDHHmmss'], true).unix(),
      media = {
        author: task.name,
        platform: 17,
        bid: task.id,
        aid: data.puid,
        title: data.title ? spiderUtils.stringHandling(data.title, 80) : 'btwk_caihongip',
        desc: spiderUtils.stringHandling(data.desc, 100),
        tag: Tag(data.desc),
        v_img: data.coverurl,
        long_t: longT(data.duration),
        play_num: data.playcount,
        forward_num: data.forwardcount,
        comment_num: data.commentCount,
        support: data.likecount,
        a_create_time
      };
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    // logger.info(media);
    spiderUtils.commentSnapshots(this.core.taskDB,
      { p: media.platform, aid: media.aid, comment_num: media.comment_num });
    callback();
  }
}
module.exports = dealWith;