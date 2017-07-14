/**
 * Created by qingyu on 16/12/2.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const moment = require('moment');

const videoList = function (data) {
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
      url: `${this.settings.spiderAPI.wangyi.userInfo + task.id}.html`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback();
        return;
      }
      if (result.statusCode != 200) {
        logger.error('获取粉丝code error：', result.statusCode);
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('json error:', result.body);
        callback();
        return;
      }
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: result.topicSet.subnum
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
        logger.error('occur error:', err);
        logger.info(`返回网易用户 ${user.bid} 连接服务器失败`);
        callback(err);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`网易用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        callback(e);
        return;
      }
      if (back.errno == 0) {
        logger.debug('网易用户：', `${user.bid} back_end`);
      } else {
        logger.error('网易用户：', `${user.bid} back_error`);
        logger.info(back);
        logger.info('user info: ', back);
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
        logger.debug('网易用户:', `${user.bid} back_end`);
      } else {
        logger.error('网易用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getList(task, callback) {
    const option = {
      ua: 2
    };
    let page = 0,
      cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.wangyi.videoInfo + task.id}/video/${page}-20.html`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('视频列表json解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (!result || result.length === 0) {
            logger.error('数据解析异常失败');
            logger.error(result);
            page += 1;
            cb();
            return;
          }
          if (result.tab_list.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          task.total += result.tab_list.length;
          this.deal(task, result.tab_list, () => {
            page += 20;
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
    const length = list.length;
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getVideo(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getVideo(task, data, callback) {
    let media;
    async.parallel(
      [
        (cb) => {
          this.getPlay(data.videoID, (err, result) => {
            cb(null, result);
          });
        },
        (cb) => {
          this.getVidInfo(data.videoID, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        const longt = data.length ? data.length : null;
        media = {
          author: task.name,
          platform: task.p,
          bid: task.id,
          aid: data.videoID,
          title: data.title.substr(0, 100).replace(/"/g, ''),
          desc: data.digest.substr(0, 100).replace(/"/g, ''),
          comment_num: result[1].replyCount || null,
          a_create_time: moment(data.ptime).format('X'),
          v_img: data.imgsrc,
          long_t: longt || (data.videoinfo ? data.videoinfo.length : null),
          class: data.TAGS,
          support: result[0].supportcount || null,
          step: result[0].opposecount || null,
          play_num: result[0].hits,
          v_url: result[1].vurl || null
        };
        media = spiderUtils.deleteProperty(media);
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        // console.log(media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getVidInfo(vid, callback) {
    const option = {
      url: `http://3g.163.com/touch/video/detail/jsonp/${vid}.html?callback=videoList`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(null, '');
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('视频详情json解析失败');
        logger.info(result);
        callback(null, '');
        return;
      }
      callback(null, result);
    });
  }
  getPlay(vid, callback) {
    const option = {
      url: `http://so.v.163.com/vote/${vid}.js`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('NO Play : ', err);
        callback(null, '');
        return;
      }
      try {
        result = result.body.replace('var vote = ', '').replace(';', '');
        result = JSON.parse(result);
      } catch (e) {
        logger.error('视频播放json解析失败');
        logger.info(result);
        callback(null, '');
        return;
      }
      callback(null, result.info);
    });
  }
}
module.exports = dealWith;