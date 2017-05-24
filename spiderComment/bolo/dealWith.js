/**
* Created by zhupenghui on 2017/5/18.
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
    this.getCommentList(task, () => {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getCommentList(task, callback) {
    const option = {
      url: `http://bolo.163.com/bolo/api/video/commentList.htm?videoId=${task.aid}&pageNum=1&pageSize=-1&type=0`,
      ua: 1
    };
    let length = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        this.getCommentList(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论列表解析失败', result.body);
        this.getCommentList(task, callback);
        return;
      }
      if (!result.data || result.data.length <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      task.cNum = result.totalCommentCount;
      if (Number(task.cNum) - Number(task.commentNum) <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (Number(task.cNum) - Number(task.commentNum) > 0) {
        length = Number(task.cNum) - Number(task.commentNum);
      }
      task.lastId = result.data[0].id;
      task.lastTime = parseInt(result.data[0].createTime / 1000);
      task.addCount = length;
      this.deal(task, result.data, length, () => {
        callback();
      });
    });
  }
  deal(task, comments, length, callback) {
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        time = parseInt(comments[index].createTime / 1000);
        if (task.commentId == comments[index].id || task.commentTime >= time) {
          callback();
          return;
        }
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
