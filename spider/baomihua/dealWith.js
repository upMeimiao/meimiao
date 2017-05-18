/**
 * Created by junhao on 16/7/28.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const jsonp = function (data) {
  return data;
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
      url: this.settings.spiderAPI.baomihua.userInfo + task.id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
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
      result = result.result;
      if (!result.ChannelInfo) {
        callback(JSON.stringify(result));
        return;
      }
      const user = {
        platform: 13,
        bid: task.id,
        fans_num: result.ChannelInfo.RssNum
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
    request.post(logger, option, (err, back) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`爆米花用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        callback(e);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('爆米花用户:', `${user.bid} back_end`);
      } else {
        logger.error('爆米花用户:', `${user.bid} back_error`);
        logger.info(back);
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
        logger.debug('爆米花用户:', `${user.bid} back_end`);
      } else {
        logger.error('爆米花用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getList(task, callback) {
    const option = {};
    let sign = true, minid;
    async.whilst(
      () => sign,
      (cb) => {
        if (minid) {
          option.url = `${this.settings.spiderAPI.baomihua.mediaList + task.id}&minid=${minid}`;
        } else {
          option.url = this.settings.spiderAPI.baomihua.mediaList + task.id;
        }
        request.get(logger, option, (err, result) => {
          if (err) {
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
          result = result.result;
          if (!result.VideoList || result.VideoList === 'null') {
            logger.debug('已经没有数据');
            sign = false;
            cb();
            return;
          }
          task.total = result.allCount;
          const list = result.VideoList,
            length = list.length;
          minid = list[length - 1].RECORID;
          this.deal(task, list, () => {
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
        this.info(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  info(task, video, callback) {
    const id = video.OBJID;
    async.parallel([
      (cb) => {
        this.getExpr(id, (err, data) => {
          if (err) {
            cb(err);
          } else {
            cb(null, data);
          }
        });
      },
      (cb) => {
        this.getExprPC(id, (err, data) => {
          if (err) {
            cb(err);
          } else {
            cb(null, data);
          }
        });
      },
      (cb) => {
        this.getPlayNum(task, id, (err, data) => {
          if (err) {
            cb(err);
          } else {
            cb(null, data);
          }
        });
      }
    ], (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      const media = {
        author: task.name,
        platform: 13,
        bid: task.id,
        aid: id,
        title: spiderUtils.stringHandling(video.OBJTITLE, 100),
        desc: spiderUtils.stringHandling(video.OBJDESC, 100),
        play_num: Number(result[2]),
        comment_num: Number(result[0].reviewCount),
        forward_num: Number(result[0].shareCount),
        support: Number(result[0].zanCount) + Number(result[1].zancount),
        save_num: Number(result[0].collectCount) + Number(result[1].CollectionCount),
        v_img: video.IMGURL
      };
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
  getExpr(id, callback) {
    const option = {
      url: this.settings.spiderAPI.baomihua.expr_m + id,
      ua: 3,
      own_ua: 'BMHVideo/3.3.3 (iPhone; iOS 10.1.1; Scale/3.00)'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('返回JSON格式不正确');
        logger.info('expr_m:', result);
        callback(e);
        return;
      }
      callback(null, result.result.item[0]);
    });
  }
  getExprPC(id, callback) {
    const option = {
      url: `${this.settings.spiderAPI.baomihua.expr_pc + id}&_=${(new Date()).getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('getExpr jsonp error');
        logger.error(result.body);
        callback(e);
        return;
      }

      if (result.length === 0) {
        callback(null, { zancount: 0, CollectionCount: 0 });
        return;
      }
      callback(null, result[0]);
    });
  }
  getPlayNum(task, id, callback) {
    const option = {
      url: `${this.settings.spiderAPI.baomihua.play}${task.id}&flvid=${id}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      result = eval(result.body);
      callback(null, result.appinfo[0].playCount);
    });
  }
}
module.exports = dealWith;