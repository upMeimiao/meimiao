/**
 * Created by junhao on 16/6/22.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const _tag = (raw) => {
  if (typeof raw === 'string') {
    return raw;
  }
  if (Object.prototype.toString.call(raw) === '[object Array]') {
    return raw.join(',');
  }
  return '';
};
const _class = (raw) => {
  const _classArr = [];
  if (!raw) {
    return '';
  }
  if (Object.prototype.toString.call(raw) === '[object Array]' && raw.length !== 0) {
    for (const elem of raw.entries()) {
      _classArr.push(elem[1].categoryName);
    }
    return _classArr.join(',');
  }
  if (Object.prototype.toString.call(raw) === '[object Array]' && raw.length === 0) {
    return '';
  }
  if (typeof raw === 'object') {
    return raw.categoryName;
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
      url: `${this.settings.spiderAPI.miaopai.api}1&per=20&suid=${task.id}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
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
      const userInfo = result.header,
        user = {
          platform: 7,
          bid: userInfo.suid,
          fans_num: userInfo.eventCnt.fans
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
        logger.info(`返回秒拍用户 ${user.bid} 连接服务器失败`);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`秒拍用户 ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('秒拍用户:', `${user.bid} back_end`);
      } else {
        logger.error('秒拍用户:', `${user.bid} back_error`);
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
  getTotal(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.miaopai.api}1&per=20&suid=${task.id}`
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
        logger.info('desc error:', result.body);
        callback(e);
        return;
      }
      const videosCount = result.total;
      let page;
      task.total = videosCount;
      if (videosCount % 20 === 0) {
        page = videosCount / 20;
      } else {
        page = Math.floor(videosCount / 20) + 1;
      }
      this.getVideos(task, page, () => {
        callback();
      });
    });
  }
  getVideos(task, page, callback) {
    let sign = 1, option, videos;
    async.whilst(
      () => sign <= page,
      (cb) => {
        option = {
          url: `${this.settings.spiderAPI.miaopai.api + sign}&per=20&suid=${task.id}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info(result.body);
            cb();
            return;
          }
          videos = result.result;
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
    const length = list.length;
    let index = 0,
      video, data;
    async.whilst(
      () => index < length,
      (cb) => {
        video = list[index];
        this.getInfo(video.channel.scid, (err, result) => {
          data = {
            author: task.name,
            platform: 7,
            bid: task.id,
            aid: video.channel.scid,
            title: video.channel.ext.ft ? video.channel.ext.ft.substr(0, 100).replace(/"/g, '') : 'btwk_caihongip',
            desc: video.channel.ext.t.substr(0, 100).replace(/"/g, ''),
            play_num: video.channel.stat.vcnt,
            comment_num: video.channel.stat.ccnt,
            support: video.channel.stat.lcnt,
            forward_num: video.channel.stat.scnt,
            a_create_time: Math.ceil(video.channel.ext.finishTime / 1000)
          };
          if (!err) {
            data.v_img = result.v_img;
            data.long_t = result.long_t;
            data.class = result.class;
            data.tag = result.tag;
          }
          spiderUtils.saveCache(this.core.cache_db, 'cache', data);
          spiderUtils.commentSnapshots(this.core.taskDB,
            { p: data.platform, aid: data.aid, comment_num: data.comment_num });
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
  );
  }
  getInfo(id, callback) {
    const option = {
      url: `http://api.miaopai.com/m/v2_channel.json?fillType=259&scid=${id}&vend=miaopai`
    };
    const dataJson = {};
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('秒拍getInfo error');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`秒拍getInfo json 解析: ${result.statusCode}`);
        callback(e);
        return;
      }
      if (Number(result.status) !== 200) {
        logger.error(result);
        callback(true);
        return;
      }
      dataJson.long_t = result.result.ext.length;
      dataJson.v_img = result.result.pic.base + result.result.pic.m;
      dataJson.class = _class(result.result.category_info);
      dataJson.tag = _tag(result.result.topicinfo);
      callback(null, dataJson);
    });
  }
}
module.exports = dealWith;