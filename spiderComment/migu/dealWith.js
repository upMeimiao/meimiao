/**
* Created by zhupenghui on 2017/5/18.
*/
const async = require('neo-async');
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
    this.getCommentTotal(task, () => {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getCommentTotal(task, callback) {
    const option = {
      url: `http://www.migudm.cn/ugc/${task.aid}/commentList_p1.html`,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    let num = 0;
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('评论总数请求失败');
        this.getCommentTotal(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(e);
        this.getCommentTotal(task, callback);
        return;
      }
      if (!result.data.comments || result.data.comments.length <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      task.cNum = result.data.totalCmt;
      if (Number(task.cNum) - Number(task.commentNum) <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (Number(task.cNum) - Number(task.commentNum) > 0) {
        num = Number(task.cNum) - Number(task.commentNum);
      }
      task.lastId = result.data.comments[0].firstLevelCommentId;
      task.addCount = num;
      this.getCommentList(task, num, () => {
        callback();
      });
    });
  }
  getCommentList(task, num, callback) {
    const option = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    let index = 1,
      page = num % 10 === 0 ? num / 10 : Math.ceil(num / 10);
    async.whilst(
      () => index <= page,
      (cb) => {
        option.url = `http://www.migudm.cn/ugc/${task.aid}/commentList_p${index}.html`;
        request.post(logger, option, (err, result) => {
          if (err) {
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            cb();
            return;
          }
          this.deal(task, result.data.comments, () => {
            if (task.isEnd) {
              page = -1;
            }
            index += 1;
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
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        if (task.commentId == comments[index].id) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].firstLevelCommentId,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          support: comments[index].praiseTotal,
          c_user: {
            uid: comments[index].hwUserId,
            uname: comments[index].nickName,
            uavatar: comments[index].userThumUrl
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
