/**
 * Created by junhao on 16/6/21.
 */
const async = require('async');
const request = require('../../lib/request');
const cheerio = require('cheerio');
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
    this.getVidList(task, (err) => {
      if (err) {
        return callback(err);
      }
      callback(null, task.total);
    });
  }

  getVidList(task, callback) {
    let sign = 0,
      page = 1,
      month = '';
    async.whilst(
            () => sign < page,
            (cb) => {
              const option = {
                url: `${this.settings.spiderAPI.mgtv.listVideo + task.id}&month=${month}&_=${(new Date()).getTime()}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.error('接口请求错误 : ', err);
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.error('json数据解析失败');
                  logger.info(result);
                  sign++;
                  page++;
                  return cb();
                }
                const length = result.data.list.length;
                task.total += length;
                if (sign >= result.data.tab_m.length) {
                  logger.debug('已经没有数据');
                  page = 0;
                  sign++;
                  return cb();
                }
                month = result.data.tab_m[sign].m;
                this.deal(task, result.data.list, length, () => {
                  sign++;
                  page++;
                  cb();
                });
              });
            },
            (err, result) => {
              callback();
            }
        );
  }
  deal(task, user, length, callback) {
    let index = 0;
    async.whilst(
            () => index < length,
            (cb) => {
              this.getAllInfo(task, user[index], () => {
                index++;
                cb();
              });
            },
            (err, data) => {
              callback();
            }
        );
  }
  getAllInfo(task, video, callback) {
    async.parallel([
      (cb) => {
        this.getVideoInfo(task, video, (err, result) => {
          if (err) {
            return cb(err);
          }
          cb(null, result);
        });
      },
      (cb) => {
        this.getPlayNum(video, (err, result) => {
          if (err) {
            return cb(err);
          }
          cb(null, result);
        });
      },
      (cb) => {
        this.getClass(video, (err, result) => {
          if (err) {
            return cb(err);
          }
          cb(null, result);
        });
      },
      (cb) => {
        this.getDesc(task, video, (err, result) => {
          if (err) {
            return cb(err);
          }
          cb(null, result);
        });
      },
      (cb) => {
        this.getLike(video, (err, result) => {
          if (err) {
            return cb(err);
          }
          cb(null, result);
        });
      },
      (cb) => {
        this.getComNum(video, (err, result) => {
          if (err) {
            return cb(err);
          }
          cb(null, result);
        });
      }
    ], (err, result) => {
      if (err) {
        return callback(err);
      }
      const media = {
        author: task.name,
        platform: task.p,
        bid: task.id,
        aid: video.video_id,
        title: video.t1.replace(/"/g, ''),
        long_t: result[0].info.duration,
        v_img: video.img,
        v_url: `http://www.mgtv.com${video.url}`,
        play_num: result[1].all,
        class: result[2].fstlvlName,
        support: result[4].data.like,
        step: result[4].data.unlike,
        desc: result[3] ? result[3].substring(0, 100).replace(/"/g, '') : '',
        comment_num: result[5].total_number
      };
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
  getComNum(video, callback) {
    const option = {
      url: `http://comment.mgtv.com/video_comment/list/?subject_id=${video.video_id}&page=1&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug(`视频评论数请求失败 ${err}`);
        return callback(err, null);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('数据解析失败');
        return callback(e, null);
      }
      if (!result.total_number) {
        result.total_number = '';
      }
      callback(null, result);
    });
  }
  getLike(video, callback) {
    const option = {
      url: `http://vc.mgtv.com/v2/dynamicinfo?vid=${video.video_id}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug(`视频评论数、点赞量、踩请求失败 ${err}`);
        return callback(err, null);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('数据解析失败');
        return callback(e, null);
      }
      if (!result.data) {
        result.data = {
          like: '',
          unlike: ''
        };
      }
      callback(null, result);
    });
  }
  getDesc(task, video, callback) {
    let option = {
        url: `http://www.mgtv.com/b/${task.id}/${video.video_id}.html`
      },
      desc = '';
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug(`描述请求失败 ${err}`);
        return callback(err, null);
      }

      const $ = cheerio.load(result.body);
      desc = $('span.details').text();
      callback(null, desc);
    });
  }
  getClass(video, callback) {
    const option = {
      url: `http://mobile.api.hunantv.com/v7/video/info?device=iPhone&videoId=${video.video_id}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug(`视频播放量请求失败 ${err}`);
        return callback(err, null);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('数据解析失败');
        return callback(e, null);
      }
      if (!result.data.fstlvlName) {
        result.data = {
          fstlvlName: ''
        };
      }
      callback(null, result.data);
    });
  }
  getPlayNum(video, callback) {
    const option = {
            // 用户的信息后边参数是cid,播放量是vid
      url: `${this.settings.spiderAPI.mgtv.userInfo}vid=${video.video_id}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug(`视频播放量请求失败 ${err}`);
        return callback(err, null);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('数据解析失败');
        return callback(e, null);
      }
      if (!result.data.all) {
        result.data.all = '';
      }
      callback(null, result.data);
    });
  }
  getVideoInfo(task, video, callback) {
    const option = {
      url: this.settings.spiderAPI.mgtv.videoInfo + video.video_id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug(`单个视频请求失败 ${err}`);
        return callback(err, null);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('数据解析失败');
        return callback(e, null);
      }
      if (!result.info) {
        result.info = {
          duration: ''
        };
      } else if (!result.info.duration) {
        result.info = {
          duration: ''
        };
      }
      callback(null, result.data);
    });
  }
}
module.exports = dealWith;