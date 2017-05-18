/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('async');
const cheerio = require('cheerio');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const getVidTime = (time) => {
  const timeArr = time.split(':');
  let longT = '';
  if (timeArr.length === 2) {
    longT = parseInt(timeArr[0] * 60, 10) + parseInt(timeArr[1], 10);
  } else if (timeArr.length === 3) {
    longT = parseInt((timeArr[0] * 60) * 60, 10)
      + parseInt(timeArr[1] * 60, 10) + parseInt(timeArr[2], 10);
  }
  return longT;
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
    this.getVideo(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }
  getVideo(task, callback) {
    const option = {};
    if (task.id.toString().length < 6) {
      option.url = `http://www.fun.tv/channel/lists/${task.id}/`;
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('视频总量接口请求错误 : ', err);
          callback(err);
          return;
        }
        const $ = cheerio.load(result.body),
          vidObj = $('div.mod-wrap-in.mod-li-lay.chan-mgtp>div');
        async.parallel(
          {
            user: (cb) => {
              this.getFans(task, 0, () => {
                cb(null, '粉丝数信息已返回');
              });
            },
            media: (cb) => {
              this.getVideoList(task, vidObj, () => {
                cb(null, '视频信息已返回');
              });
            }
          },
          (error, _result) => {
            logger.debug(`${task.id}_result`, _result);
            callback(null, task.total);
          }
        );
      });
    } else {
      option.url = `http://pm.funshion.com/v5/media/episode?cl=iphone&id=${task.id}&si=0&uc=202&ve=3.2.9.2`;
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('视频总量接口请求错误 : ', err);
          callback(err);
          return;
        }
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.error('视频总量数据解析失败');
          logger.info(result);
          callback(e.message);
          return;
        }
        if (result.retcode == 404) {
          spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
          callback();
          return;
        }
        task.total = result.total;
        this.getVidList(task, callback);
      });
    }
  }
  getFans(task, times, callback) {
    const name = encodeURIComponent(task.name),
      option = {
        url: `http://www.fun.tv/search/?word=${name}&type=site`
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('风行网的粉丝数请求失败');
        times += 1;
        if (times <= 3) {
          this.getFans(task, times, callback);
          return;
        }
        callback(err);
        return;
      }
      const $ = cheerio.load(result.body),
        list = $('div.search-result>div.search-item'),
        user = {
          bid: task.id,
          platform: 34
        };
      for (let i = 0; i < list.length; i += 1) {
        const bid = list.eq(i).attr('block').match(/g_\d*/).toString()
          .replace('g_', '');
        if (task.id == bid) {
          user.fans_num = list.eq(i).find('div.mod-li-i div.mod-sub-wrap span.sub-tip b').text();
          logger.info(user);
          this.sendUser(user);
          this.sendStagingUser(user);
          callback();
        }
      }
    });
  }
  sendUser(user) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, back) => {
      if (err) {
        logger.error('occur error : ', err);
        logger.info(`返回风行用户 ${user.bid} 连接服务器失败`);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`风行用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('风行用户:', `${user.bid} back_end`);
      } else {
        logger.error('风行用户:', `${user.bid} back_error`);
        logger.info(back);
        logger.info('user info: ', user);
      }
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
        logger.debug('风行用户:', `${user.bid} back_end`);
      } else {
        logger.error('风行用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getVideoList(task, vidObj, callback) {
    let index = 0,
      h = null,
      dataJson = null,
      startIndex = null,
      endIndex = null,
      length = null,
      content = null;
    const vidlength = vidObj.length,
      option = {};
    task.type = '视频号';
    async.whilst(
      () => index < vidlength,
      (cb) => {
        h = vidObj.eq(index).find('a').attr('data-id');
        option.url = `http://www.fun.tv/vplay/c-${task.id}.h-${h}/`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('视频总量接口请求错误 : ', err);
            cb();
            return;
          }
          result = result.body.replace(/[\s\n\r]/g, '');
          startIndex = result.indexOf('{"dvideos":');
          endIndex = result.indexOf(';window.shareInfo');
          dataJson = result.substring(startIndex, endIndex);
          try {
            dataJson = JSON.parse(dataJson);
          } catch (e) {
            logger.debug(dataJson);
            logger.debug('视频列表解析失败');
            cb();
            return;
          }
          length = dataJson.dvideos[0].videos.length;
          content = dataJson.dvideos[0].videos;
          task.h = h;
          task.total += length;
          this.deal(task, content, length, () => {
            index += 1;
            cb();
          });
        });
      },
      () => {
        logger.debug('视频数据请求完成');
        callback();
      }
    );
  }
  getVidList(task, callback) {
    task.type = '原创';
    const option = {
      url: `http://pm.funshion.com/v5/media/episode?cl=iphone&id=${task.id}&si=0&uc=202&ve=3.2.9.2`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('列表接口请求错误 : ', err);
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
      const length = result.episodes.length,
        content = result.episodes;
      this.deal(task, content, length, () => {
        logger.debug('数据请求完成');
        callback();
      });
    });
  }
  deal(task, user, length, callback) {
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getAllInfo(task, user[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getAllInfo(task, video, callback) {
    if (task.type === '视频号') {
      async.series(
        [
          (cb) => {
            this.getVideoInfo(task, video.videoid, (err, result) => {
              cb(err, result);
            });
          }
        ],
          (err, result) => {
            const media = {
              author: task.name,
              platform: task.p,
              bid: task.id,
              aid: video.videoid,
              title: result[0].name ? result[0].name.replace(/"/g, '') : '',
              comment_num: result[0].comment_num ? result[0].comment_num : '',
              class: result[0].channel ? result[0].channel : '',
              long_t: video.raw_dura,
              desc: result[0].brief ? result[0].brief.substring(0, 100).replace(/"/g, '') : '',
              v_img: video.still,
              play_num: video.play_index,
              v_url: result[0].share ? result[0].share : '',
              a_create_time: result[0].release ? result[0].release : ''
            };
            spiderUtils.saveCache(this.core.cache_db, 'cache', media);
            callback();
          }
        );
    } else {
      async.series(
        [
          (cb) => {
            this.getVideoInfo(task, video.id, (err, result) => {
              cb(err, result);
            });
          }
        ],
          (err, result) => {
            const media = {
              author: task.name,
              platform: task.p,
              bid: task.id,
              aid: video.id,
              title: video.name.replace(/"/g, ''),
              comment_num: result[0].comment_num,
              class: result[0].class,
              long_t: getVidTime(video.duration),
              v_img: video.still,
              play_num: video.total_vv,
              v_url: `http://www.fun.tv/vplay/g-${task.id}.v-${video.id}/`,
              a_create_time: result[0].time
            };
            spiderUtils.saveCache(this.core.cache_db, 'cache', media);
            spiderUtils.commentSnapshots(this.core.taskDB,
              { p: media.platform, aid: media.aid, comment_num: media.comment_num });
            callback();
          }
        );
    }
  }
  getVideoInfo(task, vid, callback) {
    const option = {};
    if (task.type === '视频号') {
      option.url = `http://pv.funshion.com/v5/video/profile?cl=iphone&id=${vid}&si=0&uc=202&ve=3.2.9.2`;
      async.waterfall(
        [
          (cb) => {
            this.getComment(vid, (err, result) => {
              cb(err, result);
            });
          }
        ],
          (err, data) => {
            request.get(logger, option, (err, result) => {
              if (err) {
                logger.error('单个视频接口请求错误 : ', err);
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
              result.release = result.release.replace(/[年月]/g, '-').replace('日', '');
              const time = new Date(`${result.release} 00:00:00`);
              result.release = moment(time).format('X');
              result.comment_num = data || '';
              callback(null, result);
            });
          }
        );
    } else {
      option.url = `http://www.fun.tv/vplay/g-${task.id}.v-${vid}/`;
      async.waterfall(
        [
          (cb) => {
            this.getCreatTime(task.id, vid, (error, result) => {
              cb(error, result);
            });
          }
        ],
          (err, data) => {
            request.get(logger, option, (err, result) => {
              if (err) {
                logger.error('单个DOM接口请求错误 : ', err);
                callback(err);
                return;
              }
              const $ = cheerio.load(result.body),
                vidClass = $('div.crumbsline a').eq(1).text(),
                commentNum = $('a.commentbtn span.count').text(),
                res = {
                  comment_num: commentNum || '',
                  class: vidClass || '',
                  time: data || ''
                };
              callback(null, res);
            });
          }
        );
    }
  }
  getCreatTime(id, vid, callback) {
    const option = {
      url: `http://api1.fun.tv/ajax/new_playinfo/gallery/${vid}/?user=funshion&mid=${id}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('time接口请求错误 : ', err);
        callback(err);
        // TODO 错误重试
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
      result.data.number = moment(`${result.data.number} 00:00:00`, 'YYYYMMDD HH:mm:ss').format('X');
      callback(null, result.data.number);
    });
  }
  getComment(vid, callback) {
    const option = {
      url: `http://api1.fun.tv/comment/display/video/${vid}?pg=1&isajax=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论接口请求错误 : ', err);
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
      callback(null, result.data.total_num);
    });
  }
}
module.exports = dealWith;