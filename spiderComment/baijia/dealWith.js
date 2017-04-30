/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request');
const async = require('async');
const Utils = require('../../lib/spiderUtils');

const jsonp = function (data) {
  return data;
};

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
        url: `${this.settings.baijia + task.aid}&pn=0`
      },
      total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('百家号的评论总数请求失败');
        return this.total(task, callback);
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('数据解析失败');
        logger.info(result);
        return this.total(task, callback);
      }
      task.cNum = result.data.total_count;
      if ((task.cNum - task.commentNum) === 0) {
        return callback(null, 'add_0');
      }
      task.lastTime = result.data.reply_list[0].time;
      task.lastId = result.data.reply_list[0].reply_id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, (err) => {
        callback();
      });
    });
  }
  commentList(task, callback) {
    let page = 0,
      cycle = true,
      option = {};
    async.whilst(
			() => cycle,
			(cb) => {
  option.url = `${this.settings.baijia + task.aid}&pn=${page}`;
  request.get(logger, option, (err, result) => {
    if (err) {
      logger.debug('百家号评论列表请求失败', err);
      return cb();
    }
    try {
      result = eval(result.body);
    } catch (e) {
      logger.debug('百家号评论数据解析失败');
      logger.info(result);
      return cb();
    }
    if (result.data.reply_list.length <= 0) {
      cycle = false;
      return cb();
    }
    this.deal(task, result.data.reply_list, (err) => {
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
      comment;
    async.whilst(
			() => index < length,
			(cb) => {
  if (task.commentId == comments[index].reply_id || task.commentTime >= comments[index].time) {
    task.isEnd = true;
    return callback();
  }
  comment = {
    cid: comments[index].reply_id,
    content: Utils.stringHandling(comments[index].reply_content.content),
    platform: task.p,
    bid: task.bid,
    aid: task.aid,
    ctime: comments[index].time,
    support: '',
    step: '',
    c_user: {
      uname: comments[index].uname,
      uavatar: comments[index].avatar
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
