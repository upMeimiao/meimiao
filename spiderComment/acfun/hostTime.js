/**
 * Created by dell on 2017/3/9.
 */
const async = require('async');
const moment = require('moment');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

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
    this.getTime(task, (err) => {
      if (err) {
        callback(err);
      } else {
        callback(null, task.hostTotal, task.timeTotal);
      }
    });
  }
  getTime(task, callback) {
    let page = 1;
    const option = {},
      total = this.settings.commentTotal % 50 === 0 ?
        this.settings.commentTotal / 50 : Math.ceil(this.settings.commentTotal / 50);
    async.whilst(
      () => page < total,
      (cb) => {
        option.url = `${this.settings.acfun}${task.aid}&currentPage=${page}`;
        logger.debug(option.url);
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('acfun评论列表请求失败', err);
            if (err.status == 500) {
              page += 1;
            }
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('acfun评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data, () => {
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
  deal(task, comments, callback) {
    let index = 0,
      comment,
      commentData,
      time;
    const length = comments.commentList.length;
    async.whilst(
      () => index < length,
      (cb) => {
        commentData = comments.commentContentArr[`c${comments.commentList[index]}`];
        time = moment(new Date(commentData.postDate)).format('X');
        comment = {
          cid: commentData.cid,
          content: spiderUtils.stringHandling(commentData.content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          support: commentData.ups,
          step: commentData.downs,
          c_user: {
            uid: commentData.userID,
            uname: commentData.userName,
            uavatar: commentData.userImg
          }
        };
        task.timeTotal += 1;
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