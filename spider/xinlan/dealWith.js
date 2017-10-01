/**
 * Created by junhao on 16/6/21.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const _Callback = (data) => data;
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
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }

  getVidList(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.xinlan.listVideo + task.id}&cid=${task.encodeId}&_=${new Date().getTime()}`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('接口请求错误 : ', err);
        this.getVidList(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败', result);
        this.getVidList(task, callback);
        return;
      }
      if (!result.data || !result.data.length) {
        this.getVidList(task, callback);
        return;
      }
      const length = result.data.length;
      task.total = length;
      this.deal(task, result.data, length, () => {
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
      () => callback()
    );
  }
  getAllInfo(task, video, callback) {
    const num = 0;
    async.parallel([
      (cb) => {
        this.getVideoInfo(video.vid, num, (err, result) => {
          cb(null, result);
        });
      },
      (cb) => {
        this.getComment(task, video.vid, (err, result) => {
          cb(null, result);
        });
      },
      (cb) => {
        this.getSupport(video.vid, (err, result) => {
          cb(null, result);
        });
      },
      (cb) => {
        this.getSava(video.vid, (err, result) => {
          cb(null, result);
        });
      }
    ], (err, result) => {
      if (result[0] === 'next') {
        callback();
        return;
      }
      let media = {
        author: task.name,
        platform: task.p,
        bid: task.id,
        aid: video.vid,
        title: video.title.replace(/"/g, ''),
        desc: result[0].videoBrief.replace(/"/g, ''),
        class: result[0].videoTypesDesc,
        long_t: video.durationApp,
        v_img: video.pic,
        v_url: video.url,
        comment_num: result[1],
        support: result[2].supportNumber,
        save_num: result[3].hasCollect
      };
      media = spiderUtils.deleteProperty(media);
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
  getSava(vid, callback) {
    const option = {
      url: `http://proxy.app.cztv.com/getCollectStatus.do?videoIdList=${vid}`,
      authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('收藏量请求失败', err);
        callback(null, { hasCollect: '' });
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('收藏量解析失败', result);
        callback(null, { hasCollect: '' });
        return;
      }
      callback(null, result.content.list[0]);
    });
  }
  getSupport(vid, callback) {
    const option = {
      url: `http://proxy.app.cztv.com/getSupportStatus.do?videoIdList=${vid}`,
      authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('点赞量请求失败', err);
        callback(null, { supportNumber: '' });
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('点赞量解析失败', result.body);
        callback(null, { supportNumber: '' });
        return;
      }
      if (result.content === undefined) {
        this.getSupport(vid, callback);
        return;
      }
      callback(null, result.content.list[0]);
    });
  }
  getComment(task, aid, callback) {
    const option = {
      url: `${this.settings.spiderAPI.xinlan.comment}&xid=${aid}&pid=${task.id}&page=1&_${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论量请求失败 ', err);
        callback(null, { comment_count: '' });
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论量数据解析失败', result.body);
        callback(null, { comment_count: '' });
        return;
      }
      callback(null, result.total);
    });
  }
  getVideoInfo(vid, num, callback) {
    const option = {
      url: this.settings.spiderAPI.xinlan.videoInfo + vid,
      authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('单个视频请求失败 ', err);
        if (num <= 1) {
          num += 1;
          this.getVideoInfo(vid, num, callback);
          return;
        }
        callback(null, 'next');
        return;
      }
      num = 0;
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('新蓝网单个数据解析失败');
        if (num <= 1) {
          num += 1;
          this.getVideoInfo(vid, num, callback);
          return;
        }
        callback(null, 'next');
        return;
      }
      callback(null, result.content.list[0]);
    });
  }
}
module.exports = dealWith;