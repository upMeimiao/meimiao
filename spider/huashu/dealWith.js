/**
 * Created by junhao on 16/6/21.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const jsonp = function (data) {
  return data;
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
      url: this.settings.spiderAPI.huashu.videoList + task.id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频列表请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('视频列表解析失败');
        callback(e);
        return;
      }
      for (let i = 0; i < result[1].aggData.length; i += 1) {
        if (result[1].aggData[i].name === '华数') {
          result = result[1].aggData[i];
          break;
        }
      }
      const vidInfo = result.aggRel,
        contents = result.aggChild.data[0].tele_data,
        length = contents.length;
      task.listid = vidInfo.video_sid;
      task.total = length;
      if (contents[0].vuid != null) {
        this.getVideoList(task, callback);
      } else {
        this.deal(task, vidInfo, contents, length, () => {
          logger.debug('当前用户数据请求完毕');
          callback(null);
        });
      }
    });
  }
  getVideoList(task, callback) {
    const option = {
      url: this.settings.spiderAPI.huashu.videoList2 + task.listid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频列表请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('视频列表解析失败');
        callback(e);
        return;
      }
      const contents = result.dramadatas,
        length = contents.length;
      task.type = 'list2';
      this.deal(task, result, contents, length, () => {
        logger.debug('当前用户数据请求完毕');
        callback(null);
      });
    });
  }
  deal(task, vidInfo, video, length, callback) {
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getMedia(task, vidInfo, video[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getMedia(task, vidInfo, video, callback) {
    async.series(
      [
        (cb) => {
          if (task.type === 'list2') {
            this.getVidInfo(video.episodeid, (err, result) => {
              cb(err, result);
            });
          } else {
            this.getVidInfo(video.assetid, (err, result) => {
              cb(err, result);
            });
          }
        },
        (cb) => {
          this.getComment(vidInfo.video_sid, (err, result) => {
            cb(err, result);
          });
        },
        (cb) => {
          if (task.type === 'list2') {
            this.getPlay(video.episodeid, 0, (err, result) => {
              cb(err, result);
            });
          } else {
            this.getPlay(video.assetid, 0, (err, result) => {
              cb(err, result);
            });
          }
        }
      ],
      (err, result) => {
        if (err) {
          callback();
          return;
        }
        let media;
        if (task.type === 'list2') {
          media = {
            author: task.name,
            platform: task.p,
            bid: task.id,
            aid: video.episodeid,
            title: video.episode_name.replace(/"/g, ''),
            v_img: video.episode_pic,
            v_url: result[0].wap_url,
            desc: vidInfo.abstract.substring(0, 100).replace(/"/g, ''),
            class: vidInfo.class,
            long_t: result[0].duration,
            a_create_time: result[0].updatetime,
            play_num: result[2],
            comment_num: result[1]
          };
        } else {
          media = {
            author: task.name,
            platform: task.p,
            bid: task.id,
            aid: video.assetid,
            title: video.abs.replace(/"/g, ''),
            v_img: video.img,
            v_url: video.url,
            desc: vidInfo.video_abstract.substring(0, 100).replace(/"/g, ''),
            class: result[0].class,
            long_t: result[0].duration,
            a_create_time: result[0].updatetime,
            play_num: result[2],
            comment_num: result[1]
          };
        }
        if (!media.play_num) {
          delete media.play_num;
        }
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
  );
  }
  getVidInfo(vid, callback) {
    const option = {
      url: `http://clientapi.wasu.cn/Phone/vodinfo/id/${vid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('单个视频详情请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('视频详情数据解析失败');
        callback(e);
        return;
      }
      if (!result) {
        callback('next');
        return;
      }
      if (!result.class && !result.duration && !result.updatetime) {
        callback('next');
        return;
      }
      callback(null, result);
    });
  }
  getComment(vid, callback) {
    const option = {
      url: `http://changyan.sohu.com/api/3/topic/liteload?client_id=cyrHNCs04&topic_category_id=37&page_size=10&hot_size=5&topic_source_id=${vid}&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论数请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('评论数解析失败');
        callback(e);
        return;
      }
      callback(null, result.cmt_sum);
    });
  }
  getPlay(vid, times, callback) {
    const option = {
      url: `http://pro.wasu.cn/index/vod/updateViewHit/id/${vid}/pid/37/dramaId/${vid}?${new Date().getTime()}&jsoncallback=jsonp`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('播放量请求失败', err);
        times += 1;
        if (times < 10) {
          callback(null, null);
          return;
        }
        this.getPlay(vid, times, callback);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('播放量解析失败');
        times += 1;
        if (times < 10) {
          callback(null, null);
          return;
        }
        this.getPlay(vid, times, callback);
        return;
      }
      result = result ? Number(result.replace(/,/g, '')) : '';
      callback(null, result);
    });
  }
}
module.exports = dealWith;