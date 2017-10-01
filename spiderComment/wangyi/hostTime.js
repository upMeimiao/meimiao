/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('neo-async');
const moment = require('moment');

const videoList = (data) => data;
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
    this.getReplyId(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback();
    });
  }
  getReplyId(task, callback) {
    const option = {
      url: `http://3g.163.com/touch/video/detail/jsonp/${task.OriginAid}.html?callback=videoList`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('获取评论id失败', err);
        callback(null, err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('评论ID解析失败', result.body);
        callback(null, e);
        return;
      }
      if (!result) {
        logger.error('评论ID数据异常');
        callback('replyid-error');
        return;
      }
      task.replyId = result.replyid;
      async.parallel(
        {
          hot: (cb) => {
            this.getHot(task, () => {
              cb(null, '热门评论完成');
            });
          },
          time: (cb) => {
            this.getTime(task, () => {
              cb(null, '最新评论完成');
            });
          }
        },
        (error, res) => {
          logger.debug('result: ', res);
          callback();
        }
      );
    });
  }
  getHot(task, callback) {
    let page = 1, offset = 0,
      total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20);
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `http://sdk.comment.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/${task.replyId}/comments/hotList?limit=20&headLimit=1&showLevelThreshold=72&tailLimit=2&offset=${offset}&ibc=jssdk`;
        request.get(logger, option, (err, result) => {
          if (err) {
            if (err.status === 404) {
              total = -1;
            }
            logger.debug('网易热门评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('网易热门评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.commentIds.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result, () => {
            page += 1;
            offset += 20;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  getTime(task, callback) {
    let page = 1, offset = 0,
      total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20);
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `http://sdk.comment.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/${task.replyId}/comments/newList?limit=20&showLevelThreshold=72&headLimit=0&offset=${offset}&ibc=jssdk`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('网易评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('网易评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result, () => {
            if (task.isEnd) {
              total = -1;
              cb();
              return;
            }
            page += 1;
            offset += 20;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  deal(task, comments, callback) {
    const cidArr = [];
    let index = 0,
      time,
      comment,
      commentData;
    for (const key in comments.comments) {
      cidArr.push(key);
    }
    async.whilst(
      () => index < cidArr.length,
      (cb) => {
        commentData = comments.comments[cidArr[index]];
        time = new Date(commentData.createTime);
        time = moment(time).format('X');
        comment = {
          cid: commentData.commentId,
          content: spiderUtils.stringHandling(commentData.content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          support: commentData.vote,
          step: commentData.against,
          reply: commentData.favCount,
          c_user: {
            uid: commentData.user.userId || '',
            uname: commentData.user.nickname || '',
            uavatar: commentData.user.avatar || ''
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