/**
 * Created by qingyu on 16/12/2.
 */
const async = require('async');
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
        user: (callback) => {
          this.getUser(task, (err) => {
            callback(null, '用户信息已返回');
          });
        },
        media: (callback) => {
          this.getList(task, (err) => {
            if (err) {
              return callback(err);
            }
            callback(null, '视频信息已返回');
          });
        }
      },
            (err, result) => {
              if (err) {
                return callback(err);
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
        return callback();
      }
      if (result.statusCode != 200) {
        logger.error('获取粉丝code error：', result.statusCode);
        return callback();
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('json error:', result.body);
        return callback();
      }
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: result.topicSet.subnum
      };
      this.sendUser(user, (err, result) => {
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
        return callback(err);
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`网易用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        return callback(e);
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
    let sign = 2,
      page = 0,
      countNum = 1;
    async.whilst(
            () => countNum < sign,
            (cb) => {
              const option = {
                url: `${this.settings.spiderAPI.wangyi.videoInfo + task.id}/video/${page}-20.html`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.error('occur error : ', err);
                  return cb();
                }
                if (result.statusCode != 200) {
                  logger.error('获取videos code error：', result.statusCode);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.error('视频列表json解析失败');
                  logger.info(result);
                  return cb();
                }
                if (!result || result.length == 0) {
                  logger.error('数据解析异常失败');
                  logger.error(result);
                  sign = 0;
                  countNum++;
                  return cb();
                }
                task.total += result.tab_list.length;
                if (result.tab_list.length <= 0) {
                  sign = 0;
                }
                page += 20;
                this.deal(task, result.tab_list, () => {
                  sign++;
                  countNum++;
                  cb();
                });
              });
            },
            (err, result) => {
              callback();
            }
        );
  }
  deal(task, list, callback) {
    let index = 0,
      length = list.length;
    async.whilst(
            () => index < length,
            (cb) => {
              this.getVideo(task, list[index], (err) => {
                index++;
                cb();
              });
            },
            (err, result) => {
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
              media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: data.videoID,
                title: data.title.substr(0, 100).replace(/"/g, ''),
                desc: data.digest.substr(0, 100).replace(/"/g, ''),
                comment_num: data.replyCount,
                a_create_time: moment(data.ptime).format('X'),
                v_img: data.imgsrc,
                long_t: data.length,
                class: data.TAGS,
                support: result[0].supportcount,
                step: result[0].opposecount,
                play_num: result[0].hits,
                v_url: result[1].vurl
              };
              spiderUtils.saveCache(this.core.cache_db, 'cache', media);
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
        return callback(null, '');
      }
      if (result.statusCode != 200) {
        logger.error('获取Info code error：', result.statusCode);
        return callback(null, '');
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('视频详情json解析失败');
        logger.info(result);
        return callback(null, '');
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
        return callback(null, '');
      }
      if (result.statusCode != 200) {
        logger.error('获取play code error：', result.statusCode);
        return callback(null, '');
      }
      try {
        result = result.body.replace('var vote = ', '').replace(';', '');
        result = JSON.parse(result);
      } catch (e) {
        logger.error('视频播放json解析失败');
        logger.info(result);
        return callback(null, '');
      }
      callback(null, result.info);
    });
  }
}
module.exports = dealWith;