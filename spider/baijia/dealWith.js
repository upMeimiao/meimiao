/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('async');
const cheerio = require('cheerio');
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
    task.isEnd = false;
    this.getVidList(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }
  getFan(task, vid) {
    const option = {
      url: `https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22${vid}%22%7D`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('用户粉丝数请求失败');
        this.getFan(task, vid);
        return;
      }
      const $ = cheerio.load(result.body);
      if ($('div.item p').eq(0).text() === '视频已失效，请观看其他视频') {
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      const startIndex = result.indexOf('videoData={"id'),
        endIndex = result.indexOf(';window.listInitData');
      let dataJson = result.substring(startIndex + 10, endIndex);
      try {
        dataJson = JSON.parse(dataJson);
      } catch (e) {
        logger.debug('百家号用户数据解析失败');
        return;
      }
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num: dataJson.app.fans_cnt
      };
      task.isEnd = true;
      this.sendUser(user);
      this.sendStagingUser(user);
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
        logger.info(`返回百家号视频用户 ${user.bid} 连接服务器失败`);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`百家号视频用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('百家号视频用户:', `${user.bid} back_end`);
      } else {
        logger.error('百家号视频用户:', `${user.bid} back_error`);
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
  getVidList(task, callback) {
    const option = {
      referer: `http://baijiahao.baidu.com/u?app_id=${task.id}&fr=bjhvideo`,
      ua: 1
    };
    let skip = 0, cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.baijia.videoList + task.id}&_limit=50&_skip=${skip}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('视频列表请求错误 : ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据总量解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (!result.items) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.items, () => {
            skip += 50;
            if (skip > 10000) {
              cycle = false;
              cb();
              return;
            }
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  deal(task, user, callback) {
    let index = 0;
    const length = user.length;
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
    if (video.type !== 'video') {
      callback();
      return;
    }
    async.parallel([
      (cb) => {
        if (video.feed_id === '') {
          this.getVideoInfo(null, video.url, (err, result) => {
            cb(null, result);
          });
        } else {
          if (!task.isEnd) {
            this.getFan(task, video.feed_id);
          }
          this.getVideoInfo(video.feed_id, null, (err, result) => {
            cb(null, result);
          });
        }
      }
    ], (err, result) => {
      const time = new Date(video.publish_at),
        media = {
          author: task.name,
          platform: task.p,
          bid: task.id,
          aid: video.id,
          title: spiderUtils.stringHandling(video.title, 100),
          desc: spiderUtils.stringHandling(video.abstract, 100),
          class: video.domain,
          tag: video.tag,
          long_t: result[0].long_t,
          v_img: JSON.parse(video.cover_images)[0].src,
          v_url: video.url,
          comment_num: video.comment_amount,
          forward_num: video.push_amount,
          a_create_time: moment(time).format('X'),
          play_num: result[0].playNum
        };
      if (!media.play_num && media.play_num !== 0) {
        callback();
        return;
      }
      task.total += 1;
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
  getVideoInfo(vid, url, callback) {
    const option = {};
    if (vid !== null) {
      option.url = `https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22${vid}%22%7D`;
    } else {
      option.url = url;
    }
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('单个视频请求失败 ', err);
        callback(null, { long_t: '', a_create_time: '', playNum: '' });
        return;
      }
      const $ = cheerio.load(result.body);

      if ($('div.item p').eq(0).text() === '视频已失效，请观看其他视频') {
        callback(null, { long_t: '', playNum: null });
        return;
      }
      let dataJson = result.body.replace(/[\s\n\r]/g, '');
      const startIndex = dataJson.indexOf('videoData={"id') === -1 ? dataJson.indexOf('={tplData:{') : dataJson.indexOf('videoData={"id'),
        endIndex = dataJson.indexOf(';window.listInitData') === -1 ? dataJson.indexOf(',userInfo:') : dataJson.indexOf(';window.listInitData');
      dataJson = dataJson.substring(startIndex + 10, endIndex);
      try {
        dataJson = JSON.parse(dataJson);
      } catch (e) {
        logger.debug('百家号用户数据解析失败');
        logger.info(dataJson);
        callback(null, { long_t: '', a_create_time: '', playNum: '' });
        return;
      }
      const time = dataJson.video ? dataJson.video.time_length : `json${dataJson.article.content}`;
      const res = {
        long_t: this.getVidTime(time),
        playNum: dataJson.video ? dataJson.video.playcnt : dataJson.article.read_amount
      };
      callback(null, res);
    });
  }
  getVidTime(time) {
    const json = time.substring(0, 4);
    if (json === 'json') {
      time = time.replace(/json\[/, '').replace(/\]/g, '');
      try {
        time = JSON.parse(time);
      } catch (e) {
        logger.debug('视频时长解析失败');
        logger.info(time);
      }
      return time.long;
    }
    const timeArr = time.split(':');
    let longT = '';
    if (timeArr.length === 2) {
      longT = parseInt(timeArr[0] * 60, 10) + parseInt(timeArr[1], 10);
    } else if (timeArr.length === 3) {
      longT = parseInt((timeArr[0] * 60) * 60, 10)
        + parseInt(timeArr[1] * 60, 10) + parseInt(timeArr[2], 10);
    }
    return longT;
  }
}
module.exports = dealWith;