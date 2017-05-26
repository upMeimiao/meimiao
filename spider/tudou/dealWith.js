const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const crypto = require('crypto');

const sign = (t, e) => {
  const md5 = crypto.createHash('md5');
  if (t === 'v') {
    return md5.update(`100-DDwODVkv&6c4aa6af6560efff5df3c16c704b49f1&${e}`).digest('hex');
  }
  return md5.update(`700-cJpvjG4g&bad4543751cacf3322ab683576474e31&${e}`).digest('hex');
};

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
              callback(err);
              return;
            }
            cb(null, '用户信息已返回');
          });
        },
        media: (cb) => {
          this.getTotal(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '视频信息已返回');
          });
        }
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        logger.debug(`${task.id}_result:`, result);
        callback(null, task.total);
      }
    );
  }
  getUser(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.tudou.fans}${task.encodeId}&_=${new Date().getTime()}`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('粉丝数解析失败', result.body);
        callback(e);
        return;
      }
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: result.html.sumCount
      };
      this.sendUser(user, () => {
        callback();
      });
      this.sendStagingUser(user);
      callback();
    });
  }
  getTotal(task, callback) {
    const time = new Date().getTime().toString().substring(0, 10);
    logger.debug('开始获取视频总数');
    const option = {
      url: `${this.settings.spiderAPI.tudou.newList}&pg=1&uid=${task.encodeId}&_s_=${sign('v', time)}&_t_=${time}&e=md5`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频总数请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('视频总量解析失败', result.body);
        callback(e);
        return;
      }
      task.total = result.data.videolist.total;
      this.getList(task, (error) => {
        if (error) {
          callback(err);
          return;
        }
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
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`土豆用户 ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('土豆用户:', `${user.bid} back_end`);
      } else {
        logger.error('土豆用户:', `${user.bid} back_error`);
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
  getList(task, callback) {
    const total = task.total % 20 === 0 ? task.total / 20 : Math.ceil(task.total / 20),
      option = {
        ua: 1
      },
      time = new Date().getTime().toString().substring(0, 10);
    let page = 1;
    async.whilst(
      () => page <= Math.min(total, 500),
      (cb) => {
        logger.debug(`开始获取第${page}页视频列表`);
        option.url = `${this.settings.spiderAPI.tudou.newList}&pg=${page}&uid=${task.encodeId}&_s_=${sign('v', time)}&_t_=${time}&e=md5`;
        request.get(logger, option, (err, result) => {
          if (err) {
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('视频列表解析失败', result.body);
            cb();
            return;
          }
          this.deal(task, result.data.videolist.videos, () => {
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
    async.parallel(
      [
        (cb) => {
          this.getComment(data.videoid, (err, result) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        const media = {
          author: task.name,
          platform: 12,
          bid: task.id,
          aid: data.videoid,
          title: data.title ? spiderUtils.stringHandling(data.title, 50) : 'btwk_caihongip',
          desc: data.desc ? spiderUtils.stringHandling(data.desc, 100) : '',
          play_num: data.total_vv,
          comment_num: result[0],
          class: data.category,
          v_img: data.thumburl,
          long_t: Math.round(data.seconds),
          a_create_time: data.publishtime
        };
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      });
  }
  getComment(vid, callback) {
    const time = new Date().getTime().toString().substring(0, 10),
      option = {
        url: `${this.settings.spiderAPI.tudou.comment}${vid}&objectType=1&listType=0&currentPage=1&pageSize=30&sign=${sign('c', time)}&time=${time}`,
        ua: 1
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(null, '');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('comment json数据解析失败', result.body);
        callback(null, '');
        return;
      }
      callback(null, result.data.totalSize || '');
    });
  }
}
module.exports = dealWith;