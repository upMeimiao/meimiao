/**
* Created by junhao on 2017/2/10.
*/
const async = require('async');
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
    this.commentList(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  commentList(task, callback) {
    const option = {};
    let page = 1,
      cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.mgtv + task.aid}&pageCount=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('芒果评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('芒果评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          task.cNum += result.data.length;
          if (!task.lastId) {
            task.lastId = result.data[0].commentId;
          }
          this.deal(task, result.data, () => {
            if (task.isEnd) {
              task.lastId = task.commentId;
              task.lastTime = task.commentTime;
              callback();
              return;
            }
            page += 1;
            cb();
          });
        });
      },
      () => {
        task.addCount = task.cNum - task.commentNum;
        callback();
      }
    );
  }
  deal(task, comments, callback) {
    const length = comments.length;
    let index = 0, comment;
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId == comments[index].commentId) {
          task.isEnd = true;
          task.cNum = task.commentNum + (index === 0 ? index : index + 1);
          task.addCount = task.cNum - task.commentNum;
          callback();
          return;
        }
        comment = {
          cid: comments[index].commentId,
          content: spiderUtils.stringHandling(comments[index].comment),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          c_user: {
            uname: comments[index].commentBy,
            uavatar: comments[index].commentAvatar
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
