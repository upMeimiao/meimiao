/**
 * Created by ifable on 16/9/8.
 */
const async = require('async');
const fetchUrl = require('fetch').fetchUrl;
const spiderUtils = require('../../lib/spiderUtils');

const jsonp = function (data) {
  return data;
};

let logger;
let request;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    request = spiderCore.request;
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
      url: `${this.settings.spiderAPI.tv56.userInfo}?uids=${task.id}&_=${new Date().getTime()}`,
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
        logger.error('56粉丝json数据解析失败');
        logger.error(result);
        callback(e);
        return;
      }
      const userInfo = result.data;
      if (userInfo.length === 0) {
        logger.error('异常');
        spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
        callback(true);
        return;
      }
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: userInfo[0].fansCount
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
        logger.debug('发送失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`56用户 ${user.bid} json数据解析失败`);
        logger.error(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('56用户:', `${user.bid} back_end`);
      } else {
        logger.error('56用户:', `${user.bid} back_error`);
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
  getTotal(task, callback) {
    let page = 1;
    const option = {
      url: `${this.settings.spiderAPI.tv56.list}${task.id}&_=${new Date().getTime()}&pg=${page}`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('total jsonp数据解析失败:', result);
        callback(e);
        return;
      }
      const data = result.data,
        total = data.count;
      task.total = total;
      if (total % 20 !== 0) {
        page = Math.ceil(total / 20);
      } else {
        page = total / 20;
      }
      result = null;
      this.getVideos(task, page, () => {
        callback();
      });
    });
  }
  getVideos(task, page, callback) {
    let sign = 1;
    const option = {
      ua: 1
    };
    async.whilst(
      () => sign <= Math.min(page, 500),
      (cb) => {
        option.url = `${this.settings.spiderAPI.tv56.list}${task.id}&pg=${sign}&_=${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            sign += 1;
            callback(err);
            return;
          }
          try {
            result = eval(result.body);
          } catch (e) {
            logger.error('json数据解析失败:', result);
            sign += 1;
            callback(e);
            return;
          }
          const data = result.data,
            videos = data.list;
          if (!videos) {
            cb();
            return;
          }
          result = null;
          this.deal(task, videos, () => {
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
  deal(task, list, callback) {
    let index = 0, video;
    const length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        video = list[index];
        this.info(task, video, () => {
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
    async.parallel(
      [
        (cb) => {
          this.getInfo(video.id, (err, data) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, data);
          });
        },
        (cb) => {
          this.getComment(video.id, (err, num) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, num);
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
            platform: task.p,
            bid: task.id,
            aid: video.id,
            title: video.title.substr(0, 100).replace(/"/g, ''),
            desc: result[0].video_desc.substr(0, 100).replace(/"/g, ''),
            play_num: result[0].play_count,
            long_t: video.videoLength,
            v_url: `http://www.56.com/u74/v_${video.vid56Encode}.html`,
            v_img: video.smallCover,
            class: result[0].first_cate_name,
            tag: video.tag,
            comment_num: result[1],
            a_create_time: video.uploadTime.toString().substr(0, 10)
          };
          spiderUtils.saveCache(this.core.cache_db, 'cache', media);
          spiderUtils.commentSnapshots(this.core.taskDB,
            { p: media.platform, aid: media.aid, comment_num: media.comment_num });
          callback();
        }
    );
  }
  getInfo(id, callback) {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
      }
    };
    fetchUrl(`${this.settings.spiderAPI.tv56.video}${id}&_=${new Date().getTime()}`, options, (error, meta, body) => {
      if (error) {
        logger.error('getInfo occur error : ', error);
        callback(error);
        return;
      }
      if (meta.status !== 200) {
        logger.error(`getInfo请求状态有误: ${meta.status}`);
        callback(meta.status);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.error('info error:', body);
        callback(e);
        return;
      }
      if (body.status !== 200) {
        logger.error(body);
        callback(body.statusText);
        return;
      }
      if (!body.data.video_desc) {
        logger.error(body.data);
        callback(true);
        return;
      }
      callback(null, body.data);
    });
  }
  getComment(id, callback) {
    const option = {
      url: `${this.settings.spiderAPI.tv56.comment}${id}&_=${new Date().getTime()}`,
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
        logger.info('comment error:', result);
        callback(e);
        return;
      }
      callback(null, result.cmt_sum);
    });
  }
}
module.exports = dealWith;