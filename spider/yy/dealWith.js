/**
 * Created by yunsong on 16/8/5.
 */
const async = require('async');
const cheerio = require('cheerio');
const moment = require('moment');
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
      url: this.settings.spiderAPI.yy.userInfo + task.id
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        logger.error('occur error : ', error);
        callback(error);
        return;
      }
      const $ = cheerio.load(result.body),
        fansText = $('.fans-link').text().replace('粉丝', '');
      const user = {
        platform: 20,
        bid: task.id,
        fans_num: fansText.replace(/,/g, '')
      };
      async.parallel({
        user: (cb) => {
          this.sendUser(user, () => {
            cb(null, '用户信息已返回');
          });
          this.sendStagingUser(user);
        },
        live: (cb) => {
          this.getLive(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '直播回放信息已返回');
          });
        },
        shenqu: (cb) => {
          this.getSlist(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '神曲视频信息已返回');
          });
        },
        duanpai: (cb) => {
          this.getDlist(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '短拍视频信息已返回');
          });
        }
      }, (err, raw) => {
        if (err) {
          callback(err);
          return;
        }
        logger.debug('result : ', raw);
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
        logger.info(`返回YY用户 ${user.bid} 连接服务器失败`);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`YY用户 ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('yy用户:', `${user.bid} back_end`);
      } else {
        logger.error('yy用户:', `${user.bid} back_error`);
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
  getLive(task, callback) {
    const option = {};
    let sign = 1,
      list,
      cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        logger.debug(`开始获取第${sign}页直播回放列表`);
        option.url = `${this.settings.spiderAPI.yy.liveList + task.id}&pageNum=${sign}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
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
          list = result.data.list;
          if (!task.total) {
            task.total = result.data.totalCount;
          }
          if (!list || list.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, list, '直播回放', () => {
            sign += 1;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  getSlist(task, callback) {
    const option = {};
    let sign = 1,
      cycle = true,
      list;
    async.whilst(
      () => cycle,
      (cb) => {
        logger.debug(`开始获取第${sign}页神曲视频列表`);
        option.url = `${this.settings.spiderAPI.yy.shenquList + task.id}&p=${sign}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
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
          list = result.data;
          if (!task.total) {
            task.total = result.total;
          }
          if (list.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, list, '神曲', () => {
            sign += 1;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  getDlist(task, callback) {
    const option = {};
    let sign = 1,
      cycle = true,
      list;
    async.whilst(
      () => cycle,
      (cb) => {
        logger.debug(`开始获取第${sign}页短拍视频列表`);
        option.url = `${this.settings.spiderAPI.yy.duanpaiList + task.id}&p=${sign}`;
        logger.debug(option.url);
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
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
          list = result.data;
          if (!task.total) {
            task.total = result.total;
          }
          if (list.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, list, '短片', () => {
            sign += 1;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  deal(task, list, type, callback) {
    let index = 0, video;
    async.whilst(
      () => index < list.length,
      (cb) => {
        video = list[index];
        if (video.pid) {
          this.getInfoL(task, type, video, () => {
            index += 1;
            cb();
          });
        } else {
          this.getInfo(task, type, video, () => {
            index += 1;
            cb();
          });
        }
      },
      () => {
        callback();
      }
    );
  }
  getInfoL(task, type, data, callback) {
    let title = data.title;
    if (title === '') {
      title = 'btwk_caihongip';
    }
    const media = {
      author: task.name,
      platform: 20,
      bid: task.id,
      aid: data.pid,
      title,
      play_num: Number(data.viewer) + Number(data.recordViewer),
      a_create_time: data.beginTime,
      long_t: moment.duration(data.duration).asSeconds(),
      v_url: data.playUrl,
      v_img: data.imageUrl,
      class: type
    };
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    spiderUtils.commentSnapshots(this.core.taskDB,
      { p: media.platform, aid: media.aid, comment_num: media.comment_num });
    callback();
  }
  getInfo(task, type, data, callback) {
    let title, play = data.watchCount;
    if (type === '神曲') {
      title = data.songname;
    }
    if (type === '短片') {
      title = data.resdesc;
    }
    if (title === '') {
      title = 'btwk_caihongip';
    }
    if (play.indexOf('万') !== -1) {
      play = play.replace('万', '') * 10000;
    } else if (play.indexOf('亿') !== -1) {
      play = play.replace('亿', '') * 100000000;
    }
    const time = data.addtime,
      a_create_time = moment(time).format('X'),
      media = {
        author: data.ownername,
        platform: 20,
        bid: task.id,
        aid: data.resid,
        title: title.substr(0, 100).replace(/"/g, ''),
        desc: data.resdesc.substr(0, 100).replace(/"/g, ''),
        play_num: play,
        save_num: data.favorCount,
        forward_num: data.shareCount,
        comment_num: data.commentCount,
        support: data.likeCount,
        a_create_time,
        long_t: data.duration ? moment.duration(data.duration).asSeconds() : null,
        v_img: data.snapshoturl,
        class: type,
        v_url: data.playUrl
      };
    if (!media.long_t) {
      delete media.long_t;
    }
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    spiderUtils.commentSnapshots(this.core.taskDB,
      { p: media.platform, aid: media.aid, comment_num: media.comment_num });
    callback();
  }

}
module.exports = dealWith;