/**
 * Created by yunsong on 16/8/3.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const moment = require('moment');

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
    task.num = 0;
    this.getTotal(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }
  getH(callback) {
    const options = { method: 'POST',
      url: 'http://viva.api.xiaoying.co/api/rest/d/dg',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'XiaoYing/5.3.5 (iPhone; iOS 10.1.1; Scale/3.00)'
      },
      data: {
        a: 'dg',
        b: '1.0',
        c: '20007700',
        e: 'DIqmr4fb',
        i: '{"a":"[I]a8675492c8816a22c28a1b97f890ae144a8a4fa3","b":"zh_CN"}',
        j: '6a0ea6a13e76e627121ee75c2b371ef2',
        k: 'xysdkios20130711'
      }
    };
    request.post(logger, options, (error, result) => {
      if (error) {
        callback(error);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        callback(e);
        return;
      }
      const h = result.a;
      callback(null, h.a);
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
      if (result.errno === 0) {
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
      if (result.errno === 0) {
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
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info(result);
            cb();
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
      a_create_time = moment(time, ['YYYYMMDDHHmmss'], true).unix();
    this.getComment(data.puid, (err, result) => {
      let media = {
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
        comment_num: result,
        support: data.likecount,
        a_create_time
      };
      media = spiderUtils.deleteProperty(media);
      // logger.debug(media);
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
  getComment(aid, callback) {
    const option = {
      url: this.settings.spiderAPI.xiaoying.comment,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'XiaoYing/5.5.6 (iPhone; iOS 10.2.1; Scale/3.00)'
      },
      data: {
        a: 'pa',
        b: '1.0',
        c: '20008400',
        e: 'DIqmr4fb',
        h: this.core.h,
        i: `{"d":20,"b":"1","c":1,"a":"${aid}"}`,
        j: 'ae788dbe17e25d0cff743af7c3225567',
        k: 'xysdkios20130711'
      }
    };
    request.post(logger, option, (error, result) => {
      if (error) {
        logger.debug('小影评论总量请求失败', error);
        callback(null, '');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('小影评论数据解析失败', result.body);
        callback(e);
        return;
      }
      callback(null, result.total);
    });
  }
}
module.exports = dealWith;