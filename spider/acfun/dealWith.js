/**
 * Created by yunsong on 16/9/7.
 */
const async = require('async');
const request = require('../../lib/request.js');
const channels = require('./channels');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const _tags = (raw) => {
  if (typeof raw === 'string') {
    return raw;
  }
  if (Object.prototype.toString.call(raw) === '[object Array]') {
    return raw.join(',');
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
        this.getUser(task, (err) => {
          if (err) {
            cb(err);
          } else {
            cb(null, '用户信息已返回');
          }
        });
      },
      media: (cb) => {
        this.getTotal(task, (err) => {
          if (err) {
            cb(err);
          } else {
            cb(null, '视频信息已返回');
          }
        });
      }
    }, (err, result) => {
      if (err) {
        callback(err);
      } else {
        logger.debug('result : ', result);
        callback(null, task.total);
      }
    });
  }
  getUser(task, callback) {
    const option = {
      url: this.settings.spiderAPI.acfun.userInfo + task.id,
      referer: `http://m.acfun.tv/details?upid=${task.id}`,
      deviceType: 2,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('acfun粉丝json数据解析失败');
        logger.error(result);
        callback(e);
        return;
      }
      const data = result.data,
        user = {
          platform: task.p,
          bid: task.id,
          fans_num: data.followed
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
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('send error:', result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('A站用户:', `${user.bid} back_end`);
      } else {
        logger.error('A站用户:', `${user.bid} back_error`);
        logger.info(result);
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
        logger.debug('A站用户:', `${user.bid} back_end`);
      } else {
        logger.error('A站用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getTotal(task, callback) {
    logger.debug('开始获取视频总数');
    const option = {
      url: `${this.settings.spiderAPI.acfun.media}${task.id}&pageNo=1`,
      referer: `http://www.aixifan.com/u/${task.id}.aspx`,
      ua: 1
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        callback(error);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('json1 error :', result.body);
        callback(e);
        return;
      }
      task.total = result.totalcount;
      const page = result.totalpage;
      this.getList(task, page, (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, '视频信息已返回');
      });
    });
  }
  getList(task, page, callback) {
    let sign = 1,
      option;
    async.whilst(
      () => sign <= page,
      (cb) => {
        logger.debug(`开始获取第${sign}页视频列表`);
        option = {
          url: `${this.settings.spiderAPI.acfun.media}${task.id}&pageNo=${sign}`,
          referer: `http://www.aixifan.com/u/${task.id}.aspx`,
          ua: 1
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info('json error: ', result.body);
            cb();
            return;
          }
          const list = result.contents;
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
    if (!data.vid) {
      callback();
      return;
    }
    const time = data.releaseDate,
      a_create_time = time.toString().substring(0, 10),
      media = {
        author: task.name,
        platform: 22,
        bid: task.id,
        aid: data.aid,
        title: spiderUtils.stringHandling(data.title, 100),
        desc: spiderUtils.stringHandling(data.description, 100),
        play_num: data.views,
        save_num: data.stows,
        comment_num: data.comments,
        a_create_time,
        long_t: data.time,
        v_img: data.titleImg,
        tag: _tags(data.tags),
        class: channels.get(Number(data.channelId))
      };
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    spiderUtils.commentSnapshots(this.core.taskDB,
      { p: media.platform, aid: media.aid, comment_num: media.comment_num });
    callback();
  }
}
module.exports = dealWith;