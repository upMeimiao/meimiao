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
    this.total(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  total(task, callback) {
    const option = {
      url: `${this.settings.v1}${task.aid}&pageNo=1&_${new Date().getTime()}`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('v1的评论总数请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('v1数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      if (!result.obj) {
        callback();
        return;
      }
      task.cNum = result.obj.paginator.items;
      if ((task.cNum - task.commentNum) <= 0 || !result.obj.list.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) === 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) === 0 ? total / 20 : Math.ceil(total / 20);
      }
      const comment = result.obj.list[0],
        time = new Date(comment.createTime);
      task.lastTime = moment(time).format('X');
      task.lastId = comment.commentId;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1;
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.v1}${task.aid}&pageNo=${page}&_${new Date().getTime()}`;
        logger.debug(option.url);
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('v1评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('v1评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.obj.list, () => {
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
    const length = comments.length;
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        time = new Date(comments[index].createTime);
        time = moment(time).format('X');
        if (task.commentId == comments[index].commentId || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].commentId,
          content: spiderUtils.stringHandling(comments[index].comments),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          c_user: {
            uid: comments[index].userInfo ?
              comments[index].userInfo.userId : comments[index].userId,
            uname: comments[index].userInfo ?
              (comments[index].userInfo.userName || comments[index].userInfo.nickname) :
              comments[index].auditor
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
