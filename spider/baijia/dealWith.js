/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('neo-async');
const cheerio = require('cheerio');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const _tag = (tags) => {
  let tag = '';
  if (!tags || !tags.length) {
    return '';
  }
  for (const value of tags) {
    tag += `,${value.name}`;
  }
  return tag.replace(',', '');
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
    task.isEnd = false;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb(null, '粉丝数已返回');
          });
        },
        media: (cb) => {
          this.getVidList(task, () => {
            cb(null, '视频信息已返回');
          });
        }
      },
      (err, result) => {
        logger.debug('result: ', result);
        callback(null, task.total);
      }
    );
  }
  getUser(task, callback) {
    const option = {
      url: this.settings.spiderAPI.baijia.api,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_2 like Mac OS X) AppleWebKit/603.2.4 (KHTML, like Gecko) Mobile/14F89 haokan/2.6.1 (Baidu; P2 10.3.2)/2.3.01_2,8enohP/381d/C2BB16A6BC640F0CD9DA2060098AC66793B62A080FCTOPTMEQM/1',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: {
        'baijia/authorInfo': `method=get&app_id=${task.id}`
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.debug('用户粉丝数请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('百家号用户数据解析失败', result.body);
        callback(e);
        return;
      }
      if (!result['baijia/authorInfo']) {
        callback('user-fans-error');
        return;
      }
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num: result['baijia/authorInfo'].data.subscribe_total
      };
      this.sendUser(user);
      this.sendStagingUser(user);
      callback();
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
        logger.error(`返回百家号视频用户 ${user.bid} 连接服务器失败`);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`百家号视频用户 ${user.bid} json数据解析失败`);
        logger.error(back);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('百家号视频用户:', `${user.bid} back_end`);
      } else {
        logger.error('百家号视频用户:', `${user.bid} back_error`);
        logger.error(back);
        logger.error('user info: ', user);
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
      url: `${this.settings.spiderAPI.baijia.videoList + task.id}&_limit=10000&_skip=0`,
      referer: `http://baijiahao.baidu.com/u?app_id=${task.id}&fr=bjhvideo`,
      ua: 1
    };
    let videoList = [];
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('baijia视频列表请求错误 : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('baijia-json数据总量解析失败', result.body);
        callback(e);
        return;
      }
      if (!result.items) {
        callback('baijia-list-error');
        return;
      }
      for (const value of result.items) {
        if (value.type === 'video') {
          videoList.push({
            aid: value.id,
            title: value.title,
            desc: value.abstract,
            tag: value.tag || '',
            v_img: JSON.parse(value.cover_images)[0].src,
            v_url: `http://baijiahao.baidu.com/builder/preview/s?id=${value.tp_id}`,
            comment_num: value.comment_amount,
            forward_num: value.push_amount,
            a_create_time: moment(new Date(value.publish_at)).format('X'),
            feed_id: value.feed_id,
            tpId: value.tp_id
          });
        }
      }
      this.deal(task, videoList, () => {
        callback();
      });
      videoList = null;
    });
  }
  deal(task, list, callback) {
    let index = 0;
    const length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getAllInfo(task, list[index], () => {
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
    async.parallel([
      (cb) => {
        this.getVideoInfo(video.v_url, (err, result) => {
          cb(null, result);
        });
      }
    ], (err, result) => {
      const media = {
        author: task.name,
        platform: task.p,
        bid: task.id,
        aid: video.aid,
        title: spiderUtils.stringHandling(video.title, 100),
        desc: spiderUtils.stringHandling(video.desc, 100),
        class: result[0].class || '',
        tag: result[0].tag,
        long_t: result[0].long_t || '',
        v_img: video.v_img,
        v_url: video.v_url,
        comment_num: video.comment_num,
        forward_num: video.forward_num,
        a_create_time: video.a_create_time,
        play_num: result[0].playNum
      };
      if (!media.play_num && media.play_num !== 0) {
        callback();
        return;
      }
      if (Number(media.long_t) === -1) {
        callback();
        return;
      }
      task.total += 1;
      logger.debug(media);
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
  getVideoInfo(url, callback) {
    const option = {
      url,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('单个视频请求失败 ', err);
        callback(null, { long_t: '', playNum: '' });
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
        callback(null, { long_t: '', playNum: '' });
        return;
      }
      const time = dataJson.video ? dataJson.video.time_length : `json${dataJson.article.content}`;
      const res = {
        long_t: this.getVidTime(time),
        playNum: dataJson.video ? dataJson.video.playcnt : dataJson.article.read_amount,
        class: dataJson.article ? dataJson.article.domain : '',
        tag: _tag(dataJson.article.tag)
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