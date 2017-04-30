/**
* Created by junhao on 2017/2/08.
*/
const request = require('../../lib/request');
const async = require('async');
const Utils = require('../../lib/spiderUtils');

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
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }

  commentList(task, callback) {
    let page = 1,
      cycle = true,
      option;
    async.whilst(
			() => cycle,
			(cb) => {
  option = {
    url: `${this.settings.meipai}${task.aid}&page=${page}`
  };
  request.get(logger, option, (err, result) => {
    if (err) {
      logger.debug('美拍评论列表请求失败', err);
      return cb();
    }
    try {
      result = JSON.parse(result.body);
    } catch (e) {
      logger.debug('美拍评论数据解析失败');
      logger.info(result);
      return cb();
    }
    if (result.length <= 0) {
      cycle = false;
      return cb();
    }
    if (!task.lastId) {
      task.lastId = result[0].id;
      task.lastTime = result[0].created_at_origin;
    }
    this.deal(task, result, (err) => {
      if (task.isEnd) {
        return callback();
      }
      page++;
      cb();
    });
  });
},
			(err, result) => {
  task.addCount = task.cNum - task.commentNum;
  callback();
}
		);
  }
  deal(task, comments, callback) {
    let length = comments.length,
      index = 0,
      comment;
    task.cNum += Number(length);
    async.whilst(
			() => index < length,
			(cb) => {
  if (task.commentId == comments[index].id || task.commentTime >= comments[index].created_at_origin) {
    task.isEnd = true;
    task.cNum = parseInt(task.commentNum) + (index == 0 ? index : index + 1);
    task.addCount = task.cNum - task.commentNum;
    return callback();
  }
  comment = {
    cid: comments[index].id,
    content: Utils.stringHandling(comments[index].content),
    platform: task.p,
    bid: task.bid,
    aid: task.aid,
    ctime: comments[index].created_at_origin,
    support: comments[index].liked_count,
    step: '',
    c_user: {
      uid: comments[index].user.id,
      uname: comments[index].user.screen_name ? comments[index].user.screen_name : comments[index].user.screen_name_origin,
      uavatar: comments[index].user.avatar ? comments[index].user.avatar : ''
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
