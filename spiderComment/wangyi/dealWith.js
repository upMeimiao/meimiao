/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request');
const async = require('async');
const Utils = require('../../lib/spiderUtils');
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
      if (result == 'add_0') {
        return callback(null);
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    let option = {
        url: `http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/${task.aid}008535RB/app/comments/newList?offset=0&limit=20`
      },
      total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('网易评论总量请求失败', err);
        return this.totalPage(task, callback);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('网易评论数据解析失败');
        logger.info(result.body);
        return this.totalPage(task, callback);
      }
      task.cNum = result.newListSize;
      if ((task.cNum - task.commentNum) <= 0) {
        return callback(null, 'add_0');
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20);
      }
      let comment = result.comments[result.commentIds[0]],
        time = new Date(comment.createTime);
      task.lastTime = moment(time).format('X');
      task.lastId = comment.commentId;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, (err) => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1,
      offset = 0,
      option;
    async.whilst(
			() => page <= total,
			(cb) => {
  option = {
    url: `http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/${task.aid}008535RB/app/comments/newList?offset=${offset}&limit=20`
  };
  request.get(logger, option, (err, result) => {
    if (err) {
      logger.debug('网易评论列表请求失败', err);
      return cb();
    }
    try {
      result = JSON.parse(result.body);
    } catch (e) {
      logger.debug('网易评论数据解析失败');
      logger.info(result);
      return cb();
    }
    this.deal(task, result, (err) => {
      if (task.isEnd) {
        return callback();
      }
      page++;
      offset += 20;
      cb();
    });
  });
},
			(err, result) => {
  callback();
}
		);
  }
  deal(task, comments, callback) {
    let length = comments.commentIds.length,
      index = 0,
      commentData,
      time,
      comment;
    async.whilst(
			() => index < length,
			(cb) => {
  commentData = comments.comments[comments.commentIds[index]];
  time = new Date(commentData.createTime);
  time = moment(time).format('X');
  if (task.commentId == commentData.commentId || task.commentTime >= time) {
    task.isEnd = true;
    return callback();
  }
  comment = {
    cid: commentData.commentId,
    content: Utils.stringHandling(commentData.content),
    platform: task.p,
    bid: task.bid,
    aid: task.aid,
    ctime: time,
    support: commentData.vote,
    step: commentData.against,
    reply: commentData.favCount,
    c_user: {
      uname: commentData.user.nickname,
      uavatar: commentData.user.avatar
    }
  };
  Utils.commentCache(this.core.cache_db, comment);
				// Utils.saveCache(this.core.cache_db,'comment_cache',comment)
  index++;
  cb();
},
			(err, result) => {
  callback();
}
		);
  }

}

module.exports = dealWith;
