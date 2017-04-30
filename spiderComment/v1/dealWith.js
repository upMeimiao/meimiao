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
    this.total(task, (err, result) => {
      if (result == 'add_0') {
        return callback(null);
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  total(task, callback) {
    let option = {
        url: `${this.settings.v1}${task.aid}&pageNo=1&_${new Date().getTime()}`
      },
      total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('v1的评论总数请求失败');
        return this.total(task, callback);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('v1数据解析失败');
        logger.info(result);
        return this.total(task, callback);
      }
      task.cNum = result.obj.paginator.items;
      if ((task.cNum - task.commentNum) <= 0) {
        return callback(null, 'add_0');
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20);
      }
      let comment = result.obj.list[0],
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
      option;
    async.whilst(
			() => page <= total,
			(cb) => {
  option = {
    url: `${this.settings.v1}${task.aid}&pageNo=${page}&_${new Date().getTime()}`
  };
  request.get(logger, option, (err, result) => {
    if (err) {
      logger.debug('v1评论列表请求失败', err);
      return cb();
    }
    try {
      result = JSON.parse(result.body);
    } catch (e) {
      logger.debug('v1评论数据解析失败');
      logger.info(result);
      return cb();
    }
    this.deal(task, result.obj.list, (err) => {
      if (task.isEnd) {
        return callback();
      }
      page++;
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
    let length = comments.length,
      index = 0,
      time,
      comment;
    async.whilst(
			() => index < length,
			(cb) => {
  time = new Date(comments[index].createTime);
  time = moment(time).format('X');
  if (task.commentId == comments[index].commentId || task.commentTime >= time) {
    task.isEnd = true;
    return callback();
  }
  comment = {
    cid: comments[index].commentId,
    content: Utils.stringHandling(comments[index].comments),
    platform: task.p,
    bid: task.bid,
    aid: task.aid,
    ctime: time,
    c_user: {
      uid: comments[index].userInfo.userId,
      uname: comments[index].userInfo.userName ? comments[index].userInfo.userName : comments[index].userInfo.nickname
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
