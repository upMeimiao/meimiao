/**
 * Created by penghui on 17/4/17.
 */
const async = require('async');
const request = require('../../lib/request');
const req = require('request');
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
    task.page = 0;
    this.getTotal(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }
  getTotal(task, callback) {
    const options = {
      method: 'POST',
      url: 'https://prod2.click-v.com/ds_platform/brand/getBrandDetailOutSide',
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        'Content-Type': 'application/json'
      },
      body: { brandId: task.id, pageSize: 10, pageNum: 1 },
      json: true
    };
    req(options, (error, response, body) => {
      if (error) {
        logger.debug('视频总量请求失败', error.message);
        callback(error);
        return;
      }
      if (response.statusCode !== 200) {
        logger.debug('视频总量状态码', response.statusCode);
        callback(response.statusCode);
        return;
      }
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num: body.data.attentionNum
      };
      task.total = body.data.count;
      // this.sendUser(user);
      this.sendStagingUser(user);
      this.getList(task, options, () => {
        callback();
      });
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
        logger.info(`返回点视用户 ${user.bid} 连接服务器失败`);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`点视用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('点视用户:', `${user.bid} back_end`);
      } else {
        logger.error('点视用户:', `${user.bid} back_error`);
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
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getList(task, options, callback) {
    let page = 1;
    const total = task.total % 10 === 0 ? task.total / 10 : Math.ceil(task.total / 10);
    async.whilst(
      () => page < Math.min(total, 500),
      (cb) => {
        options.body.pageNum = page;
        req(options, (error, response, body) => {
          if (error) {
            logger.debug('视频列表请求失败', error.message);
            callback(error);
            return;
          }
          if (response.statusCode !== 200) {
            logger.debug('视频列表状态码', response.statusCode);
            callback(response.statusCode);
            return;
          }
          this.deal(task, body.data.list, () => {
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
  deal(task, info, callback) {
    let index = 0;
    const length = info.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getInfo(task, info[index], () => {
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
    // const aid = data.id;
    const media = {
      bid: task.id,
      author: task.name,
      platform: task.p,
      aid: data.videoId,
      title: spiderUtils.stringHandling(data.videoTitle, 80),
      play_num: data.playTimes,
      comment_num: data.commentCount,
      save_num: data.approveTimes,
      forward_num: data.shareTimes,
      v_img: data.videoCoverUrl,
      class: data.classifyName,
      a_create_time: Math.round(data.effectTime / 1000),
      desc: spiderUtils.stringHandling(data.videoDescription, 100),
      long_t: data.videoLength
    };
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    // spiderUtils.commentSnapshots(this.core.taskDB,
    //   { p: media.platform, aid: media.aid, comment_num: media.comment_num });
    callback();
  }
}
module.exports = dealWith;