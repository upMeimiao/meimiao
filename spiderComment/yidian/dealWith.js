/**
* Created by junhao on 2017/2/08.
*/
const request = require('../../lib/request');
const async = require('async');
const spiderUtils = require('../../lib/spiderUtils');
const moment = require('moment');

let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.cNum = 0;      // 评论的数量
    task.lastId = 0;      // 第一页评论的第一个评论Id
    task.lastTime = 0;      // 第一页评论的第一个评论时间
    task.isEnd = false;  // 判断当前评论跟库里返回的评论是否一致
    task.addCount = 0;      // 新增的评论数
    this.totalPage(task, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      if (result === 'add_0') {
        callback(null);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    const option = {
      url: this.settings.yidian + task.aid
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('一点咨询评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('一点咨询评论数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      task.cNum = result.total;
      if ((task.cNum - task.commentNum) <= 0) {
        callback(null, 'add_0');
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) === 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) === 0 ? total / 20 : Math.ceil(total / 20);
      }
      const time = new Date(result.comments[0].createAt);
      task.lastTime = moment(time).format('X');
      task.lastId = result.comments[0].comment_id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1,
      lastCommentId = '',
      option;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: this.settings.yidian + task.aid + lastCommentId
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('一点咨询评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('一点咨询评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.comments, () => {
            if (task.isEnd) {
              callback();
              return;
            }
            page += 1;
            lastCommentId = `&last_comment_id=${result.comments[result.comments.length - 1].comment_id}`;
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
    const length = comments.length;
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        time = new Date(comments[index].createAt);
        time = moment(time).format('X');
        if (task.commentId == comments[index].comment_id || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].comment_id,
          content: spiderUtils.stringHandling(comments[index].comment),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          support: comments[index].like,
          ctime: time,
          c_user: {
            uavatar: comments[index].profile,
            uname: comments[index].nickname
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_cache', comment);
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
