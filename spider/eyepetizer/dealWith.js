/**
 * Created by zhupenghui on 17/7/3.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const _tag = (tags) => {
  let str = '';
  if (!tags.length) {
    return '';
  }
  for(const value of tags) {
    str += `,${value.name}`;
  }
  return str.replace(',', '');
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
    async.parallel(
      {
        media: (cb) => {
          this.getVideoList(task, () => {
            cb(null, '视频信息返回');
          });
        } // ,
        // program: (cb) => {
        //   this.core.getProgram.start(task, (err) => {
        //     if (err) {
        //       cb(err);
        //       return;
        //     }
        //     cb(null, '栏目信息已返回');
        //   });
        // }
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        logger.debug('result: ', result);
        callback(null, task.total);
      }
    );
  }
  getVideoList(task, callback) {
    const option = {
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    let cycle = true, start = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.kaiyan.list + task.id}&start=${start}&num=50`;
        // logger.debug(option.url);
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('视频列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('列表数据解析失败', result.body);
            cb();
            return;
          }
          if (!result.itemList || !result.itemList.length) {
            // logger.debug(result);
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.itemList, () => {
            start += 50;
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
        if (list[index].type !== 'video') {
          index += 1;
          cb();
          return;
        }
        this.media(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  media(task, video, callback) {
    async.parallel(
      [
        (cb) => {
          this.videoInfo(video.data.id, (err, result) => {
            cb(null, result);
          });
        },
        (cb) => {
          this.comment(video.data.id, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        if (result[0] === 'next') {
          callback();
          return;
        }
        const media = {
          author: task.name,
          bid: task.id,
          platform: task.p,
          aid: video.data.id,
          title: spiderUtils.stringHandling(video.data.title, 80),
          desc: spiderUtils.stringHandling(video.data.description, 100),
          a_create_time: parseInt(video.data.date / 1000, 10),
          v_img: video.data.cover.feed,
          class: result[0].class,
          comment_num: result[1],
          long_t: result[0].long_t,
          save_num: result[0].save_num,
          forward_num: result[0].share,
          v_url: `http://www.eyepetizer.net/detail.html?vid=${video.data.id}`,
          tag: result[0].tag
        };
        task.total = task.total || video.data.author.videoNum;
        logger.info(media);
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  videoInfo(vid, callback) {
    const option = {
      url: this.settings.spiderAPI.kaiyan.video + vid,
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('视频详情请求错误', err);
        callback(null, 'next');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('视频详情解析失败', result.body);
        callback(null, 'next');
        return;
      }
      if (!result) {
        callback(null, '');
        return;
      }
      const info = {
        class: result.category,
        save_num: result.consumption.collectionCount,
        share: result.consumption.shareCount,
        comment: result.consumption.replyCount,
        long_t: result.duration,
        tag: _tag(result.tags)
      };
      callback(null, info);
    });
  }
  comment(vid, callback) {
    const option = {
      url: `${this.settings.spiderAPI.kaiyan.comment + vid}&num=50&lastId=`,
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('commentNum 请求失败', err);
        callback(null, '');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('comment解析失败', result.body);
        callback(null, '');
        return;
      }
      callback(null, result.total);
    });
  }
}
module.exports = dealWith;