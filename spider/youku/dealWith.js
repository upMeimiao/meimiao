/**
 * Created by junhao on 16/6/22.
 */
const async = require('async');
const request = require('request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const blacklist = ['UNDQ3MzYyMTI5Ng==', 'UNDUyMDQ2OTU5Mg==', 'UNDUzODExMDgzNg==', 'UNTUxMTg0Nzc2', 'UMzQzNzMzODE5Mg==', 'UNDUxMTEzNjkxMg==', 'UNDQ3OTUwMjgwMA==', 'UNDA2NDk5NTY2MA==', 'UMzE0MTkzODk1Ng==', 'UNDM1ODkyNDc2MA==', 'UNDQ3NjI5MDg2OA==', 'UMjc0NDAwMzAwNA==', 'UMTIwODgxMTI5Mg==', 'UNDQ3MzU1ODUwNA==', 'UMzI5NjQwOTUwNA==', 'UNDQ1OTQyMjM1Mg=='];
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
          this.getUser(task, (err) => {
            if (err) {
              setTimeout(() => {
                this.getUser(task, () => cb(null, '用户信息已返回'));
              }, 1000);
              return;
            }
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
        },
        // program: (cb) => {
        //   this.core.getProgram.start(task, (err) => {
        //     if (err) {
        //       cb(err);
        //       return;
        //     }
        //     cb(null, '专辑信息已返回');
        //   });
        // }
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
    const options = {
      method: 'GET',
      url: `https://mapi-channel.youku.com/feed.stream/show/get_channel_owner_page.json?content=info&caller=1&uid=${task.encodeId}`
    };
    request(options, (err, res, body) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err.message);
        return;
      }
      if (res.statusCode !== 200) {
        callback(res.statusCode);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        callback(e.message);
        return;
      }
      if (body.code !== 1) {
        callback(body.desc);
        return;
      }
      if (!blacklist.includes(task.encodeId) && (!body.data.channelOwnerInfo.followerNum || body.data.channelOwnerInfo.followerNum == 0)) {
        callback(body);
        request({
          method: 'POST',
          url: 'http://10.251.55.50:3001/api/alarm',
          form: {
            mailGroup: 3,
            subject: '粉丝数据异常',
            content: JSON.stringify(body.data)
          }
        });
        return;
      }
      const userInfo = body.data.channelOwnerInfo,
        user = {
          platform: 1,
          bid: task.id,
          fans_num: userInfo.followerNum
        };
      // if (user.fans_num == 0) {
      //   logger.error('粉丝数据异常', body.data);
      //   request({
      //     method: 'POST',
      //     url: 'http://10.251.55.50:3001/api/alarm',
      //     form: {
      //       mailGroup: 3,
      //       subject: '粉丝数据异常',
      //       content: JSON.stringify(body.data)
      //     }
      //   });
      // }
      this.sendUser(user, () => {
        callback();
      });
      this.sendStagingUser(user);
    });
  }
  sendUser(user, callback) {
    const options = {
      method: 'POST',
      url: this.settings.sendFans,
      form: user
    };
    request(options, (err, res, body) => {
      if (err) {
        logger.error('occur error : ', err);
        logger.info(`返回优酷用户 ${user.bid} 连接服务器失败`);
        callback(err);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error(`优酷用户 ${user.bid} json数据解析失败`);
        logger.info(body);
        callback(e);
        return;
      }
      if (Number(body.errno) === 0) {
        logger.debug('优酷用户:', `${user.bid} back_end`);
      } else {
        logger.error('优酷用户:', `${user.bid} back_error`);
        logger.info(body);
        logger.info('user info: ', user);
      }
      callback();
    });
  }
  sendStagingUser(user) {
    const options = {
      method: 'POST',
      url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
      form: user
    };
    request(options, (err, res, body) => {
      if (err) {
        logger.error('occur error : ', err);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('send error:', body);
        return;
      }
      if (Number(body.errno) === 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(body);
      }
    });
  }
  getTotal(task, callback) {
    let page;
    const options = {
      method: 'GET',
      url: this.settings.spiderAPI.youku.list,
      qs: { caller: '1', pg: '1', pl: '20', uid: task.encodeId },
      headers: {
        'user-agent': 'Youku;6.1.0;iOS;10.2;iPhone8,2'
      },
      timeout: 5000
    };
    request(options, (error, response, body) => {
      if (error) {
        logger.error('occur error : ', error);
        callback(error);
        return;
      }
      if (response.statusCode !== 200) {
        logger.error(`total error code: ${response.statusCode}`);
        callback(response.statusCode);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('total error:', body);
        callback(e);
        return;
      }
      if (body.code !== 1) {
        logger.error(body);
        if (body.code === -503) {
          spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
          callback();
          return;
        }
        if (task.id === '831934191' && body.code === -102) {
          callback();
          return;
        }
        callback(body.desc);
        return;
      }
      const data = body.data;
      const total = data.total;
      task.total = total;
      if (total % 50 !== 0) {
        page = Math.ceil(total / 50);
      } else {
        page = total / 50;
      }
      this.getVideos(task, page, () => {
        callback();
      });
    });
  }
  getVideos(task, page, callback) {
    let sign = 1;
    const options = {
      method: 'GET',
      url: this.settings.spiderAPI.youku.list,
      headers: {
        'user-agent': 'Youku;6.6.1;iOS;10.3.2;iPhone8,2'
      },
      timeout: 5000
    };
    async.whilst(
      () => sign <= Math.min(page, 200),
      (cb) => {
        logger.debug(`第${sign}页`);
        options.qs = { caller: '1', pg: sign, pl: '50', uid: task.encodeId };
        request(options, (error, response, body) => {
          if (error) {
            logger.error('occur error : ', error);
            cb();
            return;
          }
          if (response.statusCode !== 200) {
            logger.error(`list error code: ${response.statusCode}`);
            cb();
            return;
          }
          try {
            body = JSON.parse(body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info('list error:', body);
            cb();
            return;
          }
          const data = body.data;
          if (!data) {
            sign += 1;
            cb();
            return;
          }
          const videos = data.videos;
          if (videos.length === 0) {
            sign += 1;
            cb();
            return;
          }
          this.info(task, videos, () => {
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
  info(task, list, callback) {
    const idList = [];
    for (const index in list) {
      idList.push(list[index].videoid);
    }
    const ids = idList.join(',');
    const options = {
      method: 'GET',
      url: 'https://openapi.youku.com/v2/videos/show_batch.json',
      qs: {
        client_id: this.settings.spiderAPI.youku.app_key,
        video_ids: ids
      },
      timeout: 5000
    };
    request(options, (error, response, body) => {
      if (error) {
        logger.error('info occur error: ', error);
        callback(error);
        return;
      }
      if (response.statusCode !== 200) {
        logger.error(`info error code: ${response.statusCode}`);
        callback(response.statusCode);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error('info json数据解析失败');
        logger.info('info error:', body);
        callback(e);
        return;
      }
      if (body.total == 0) {
        callback();
        return;
      }
      if (!body.videos) {
        callback();
        return;
      }
      this.deal(task, body.videos, list, () => {
        callback();
      });
    });
  }
  deal(task, videos, list, callback) {
    const length = videos.length;
    let index = 0,
      video, result, media;
    async.whilst(
      () => index < length,
      (cb) => {
        video = list[index];
        result = videos[index];
        media = {
          author: task.name,
          platform: 1,
          bid: task.id,
          aid: video.videoid,
          title: video.title.substr(0, 100).replace(/"/g, ''),
          desc: result.description.substr(0, 100).replace(/"/g, ''),
          class: result.category,
          tag: result.tags,
          v_img: result.bigThumbnail,
          long_t: Math.round(result.duration),
          play_num: video.total_vv,
          save_num: result.favorite_count,
          comment_num: result.comment_count,
          support: result.up_count,
          step: result.down_count,
          a_create_time: video.publishtime
        };
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        index += 1;
        cb();
      },
      () => {
        callback();
      }
    );
  }
}
module.exports = dealWith;