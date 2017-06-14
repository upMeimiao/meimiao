/**
 * Created by yunsong on 16/8/3.
 */
const async = require('neo-async');
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
let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  getH(callback) {
    const options = { method: 'POST',
      url: 'http://viva.api.xiaoying.co/api/rest/d/dg',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'XiaoYing/5.3.5 (iPhone; iOS 10.3.1; Scale/3.00)'
      },
      form: {
        a: 'dg',
        b: '1.0',
        c: '20007700',
        e: 'DIqmr4fb',
        i: '{"a":"[I]260d0f794e6df08042add854eab6508727a81004","b":"zh_CN"}',
        j: '8d5a78584410eae6ede6e4cd36d471a1',
        k: 'xysdkios20130711'
      }
    };
    newRequest(options, (error, response, body) => {
      if (error) {
        callback(error);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        callback(e);
        return;
      }
      const h = body.a;
      callback(null, h.a);
    });
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
    let sign = 1,
      page;
    if (total % 20 === 0) {
      page = total / 20;
    } else {
      page = Math.ceil(total / 20);
    }
    const options = {
      method: 'POST',
      url: this.settings.spiderAPI.xiaoying.List,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'XiaoYing/5.7.4 (iPhone; iOS 10.3.1; Scale/3.00)'
      },
      form: {
        a: 'vq',
        b: '1.0',
        c: 20006700,
        e: 'DIqmr4fb',
        h: this.core.h,
        j: '97203a5d5a0b3894b3b8b74bee12411a',
        k: 'xysdkios20130711'
      }
    };
    async.whilst(
      () => sign <= page,
      (cb) => {
        logger.debug(`开始获取第${sign}页视频列表`);
        options.form.i = `{"a":"${task.id}","b":20,"c":${sign}}`;
        newRequest(options, (err, response, body) => {
          if (err) {
            logger.error('occur error : ', err);
            callback(err);
            return;
          }
          try {
            body = JSON.parse(body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info(body);
            callback(e);
            return;
          }
          const list = body.f;
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
    const option = {
      ua: 1,
      referer: `http://xiaoying.tv/v/${data.l}/1/`,
      url: this.settings.spiderAPI.xiaoying.videoInfo + data.l
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error(`occur error : ${err}`);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('json error: ', result.body);
        callback(e);
        return;
      }
      if (!result.videoinfo) {
        callback('异常错误');
        return;
      }
      const time = result.videoinfo.publishtime,
        a_create_time = moment(time, ['YYYYMMDDHHmmss'], true).unix(),
        media = {
          author: result.videoinfo.username,
          platform: 17,
          bid: task.id,
          aid: result.videoinfo.puid,
          title: result.videoinfo.title ? spiderUtils.stringHandling(result.videoinfo.title, 80) : 'btwk_caihongip',
          desc: spiderUtils.stringHandling(result.videoinfo.desc, 100),
          tag: result.videoinfo.tags,
          v_img: result.videoinfo.coverurl,
          long_t: longT(result.videoinfo.duration),
          play_num: result.videoinfo.playcount,
          forward_num: result.videoinfo.forwardcount,
          comment_num: result.videoinfo.commentCount,
          support: result.videoinfo.likecount,
          a_create_time
        };
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
}
module.exports = dealWith;