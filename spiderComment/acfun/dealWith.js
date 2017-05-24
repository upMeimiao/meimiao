/**
* Created by junhao on 2017/2/10.
*/
const async = require('async');
const moment = require('moment');
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
    task.cNum = 0;      // 评论的数量
    task.lastId = 0;      // 第一页评论的第一个评论Id
    task.lastTime = 0;      // 第一页评论的第一个评论时间
    task.isEnd = false;  // 判断当前评论跟库里返回的评论是否一致
    task.addCount = 0;      // 新增的评论数
    this.totalPage(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `${this.settings.acfun}${task.aid}&currentPage=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('acfun评论总量请求失败', err);
        if (err.status == 500) {
          callback();
          return;
        }
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('acfun评论数据解析失败');
        logger.info(result.body);
        callback(e);
        return;
      }
      task.cNum = result.data.totalCount;
      if ((task.cNum - task.commentNum) <= 0 || !result.data.commentList.length) {
        task.lastTime = task.commentTime;
        task.lastId = task.commentId;
        callback();
        return;
      }
      let total;
      if (task.commentNum <= 0) {
        total = (task.cNum % 50) === 0 ? task.cNum / 50 : Math.ceil(task.cNum / 50);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 50) === 0 ? total / 50 : Math.ceil(total / 50);
      }
      const comment = result.data.commentContentArr[`c${result.data.commentList[0]}`];
      task.lastTime = moment(new Date(comment.postDate)).format('X');
      task.lastId = comment.cid;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    const option = {};
    let page = 1;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.acfun}${task.aid}&currentPage=${page}`;
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
          this.deal(task, result.data, () => {
            if (task.isEnd) {
              callback();
              return;
            }
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
    const length = comments.commentList.length;
    let index = 0,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        const commentData = comments.commentContentArr[`c${comments.commentList[index]}`],
          time = moment(new Date(commentData.postDate)).format('X');
        if (task.commentId === commentData.cid || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
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
