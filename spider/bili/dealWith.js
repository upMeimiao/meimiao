/**
 * Created by ifable on 16/6/21.
 */
const async = require('async');
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
      url: this.settings.spiderAPI.bili.userInfo,
      referer: `http://space.bilibili.com/${task.id}/`,
      data: {
        mid: task.id
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('用户信息 : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('json error:', result.body);
        callback(e);
        return;
      }
      const userInfo = result.data,
        user = {
          platform: 8,
          bid: userInfo.mid,
          fans_num: userInfo.fans
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
        logger.error('occur error : ', err);
        logger.info(`返回哔哩哔哩用户 ${user.bid} 连接服务器失败`);
        callback(err);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`哔哩哔哩用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        callback(e);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('哔哩哔哩用户:', `${user.bid} back_end`);
      } else {
        logger.error('哔哩哔哩用户:', `${user.bid} back_error`);
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
        logger.debug('bili用户:', `${user.bid} back_end`);
      } else {
        logger.error('bili用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getTotal(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.bili.mediaList + task.id}&pagesize=30`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('获取视频总量 : ', err);
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
      task.total = result.data.count;
      this.getVideos(task, result.data.pages, () => {
        callback();
      });
    });
  }
  getVideos(task, pages, callback) {
    let option, sign = 1;// flag = 0;
    async.whilst(
      () => sign <= Math.min(pages, 334),
      (cb) => {
        option = {
          url: `${this.settings.spiderAPI.bili.mediaList + task.id}&page=${sign}&pagesize=30`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('视频列表 : ', err);
            // flag += 1;
            // if (flag > 3) {
            //   sign += 1;
            //   cb();
            // } else {
            //   setTimeout(() => {
            //     cb();
            //   }, 300);
            //   return;
            // }
            sign += 1;
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info('list error:', result.body);
            sign += 1;
            cb();
            return;
            // flag += 1;
            // if (flag > 3) {
            //   sign += 1;
            //   cb();
            // } else {
            //   setTimeout(() => {
            //     cb();
            //   }, 300);
            //   return;
            // }
          }
          // flag = null;
          if (!result.data || !result.data.vlist) {
            logger.debug(result);
            sign += 1;
            cb();
            return;
          }
          this.deal(task, result.data.vlist, () => {
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
    let index = 0;
    const length = list.length;
    async.whilst(
      () => index < length,
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
  getInfo(task, video, callback) {
    const option = {
      url: this.settings.spiderAPI.bili.media + video.aid
    };
    request.get(logger, option, (err, back) => {
      if (err) {
        logger.error('单个视频详细信息 : ', err);
        callback(err);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('info error:', back.body);
        callback(e);
        return;
      }
      if (Number(back.code) !== 0) {
        callback();
        return;
      }
      let tagStr = '';
      if (back.data.tags && back.data.tags.length !== 0) {
        tagStr = back.data.tags.join(',');
      }
      let media = {
        author: back.data.owner.name,
        platform: 8,
        bid: task.id,
        aid: back.data.aid,
        title: spiderUtils.stringHandling(back.data.title, 100),
        desc: spiderUtils.stringHandling(back.data.desc, 100),
        play_num: back.data.stat.view,
        save_num: back.data.stat.favorite > 0 ? back.data.stat.favorite : null,
        comment_num: back.data.stat.reply,
        forward_num: back.data.stat.share,
        a_create_time: back.data.pubdate,
        long_t: spiderUtils.longTime(video.length),
        v_img: video.pic,
        class: back.data.tname,
        tag: tagStr
      };
      media = spiderUtils.deleteProperty(media);
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }

}
module.exports = dealWith;