/**
 * Created by zhupenghui on 2017/5/18.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('async');

let logger;
class hostTime {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = spiderCore.settings.logger;
  }
  todo(task, callback) {
    task.hostTotal = 0;
    task.timeTotal = 0;
    task.total = 0;
    async.parallel(
      {
        hot: (cb) => {
          this.getHot(task, () => {
            cb(null, '热门评论数据完成');
          });
        },
        time: (cb) => {
          this.getTime(task, () => {
            cb(null, '最新评论数据完成');
          });
        }
      },
      (err, result) => {
        logger.debug('result: ', result);
        callback();
      }
    );
  }
  getHot(task, callback) {
    const option = {
      url: `http://bolo.163.com/bolo/api/video/commentList.htm?videoId=${task.aid}&pageNum=1&pageSize=-1&type=1`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        this.getHot(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论列表解析失败', result.body);
        this.getHot(task, callback);
        return;
      }
      if (!result.data || result.data.length <= 0) {
        callback();
        return;
      }
      task.total = result.data.length;
      this.deal(task, result.data, () => {
        callback();
      });
    });
  }
  getTime(task, callback) {
    const option = {
      url: `http://bolo.163.com/bolo/api/video/commentList.htm?videoId=${task.aid}&pageNum=1&pageSize=-1&type=0`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        this.getTime(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论列表解析失败', result.body);
        this.getTime(task, callback);
        return;
      }
      if (!result.data || result.data.length <= 0) {
        callback();
        return;
      }
      task.total = result.data.length;
      this.deal(task, result.data, () => {
        callback();
      });
    });
  }
  deal(task, comments, callback) {
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < Math.min(task.total, this.settings.commentTotal),
      (cb) => {
        time = parseInt(comments[index].createTime / 1000, 10);
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: comments[index].supportCount,
          reply: comments[index].commentCount,
          c_user: {
            uid: comments[index].userId,
            uname: comments[index].nick,
            uavatar: comments[index].avatar
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
        index += 1;
        cb();
      },
      () => {
        callback();
      }
    );
  }
}
module.exports = hostTime;