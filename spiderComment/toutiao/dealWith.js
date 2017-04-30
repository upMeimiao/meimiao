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
    this.group_id(task, (err) => {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  group_id(task, callback) {
    let option = {
        url: `http://www.365yg.com/item/${task.aid}/`
      },
      group_id = '',
      startIndex = null,
      endIndex = null;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('单个视频请求失败');
        return this.group_id(task, callback);
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      startIndex = result.indexOf('player=');
      endIndex = result.indexOf(',nextSiblings');
      group_id = result.substring(startIndex + 7, endIndex + 5);
      group_id = group_id.replace(',next', '}').replace(/'/g, '"').replace(/:/g, '":').replace(/,/g, ',"').replace('{', '{"').replace('http"', 'http');
      group_id = JSON.parse(group_id).group_id;
      if (!group_id) {
        task.group_id = task.aid;
      } else if (group_id == task.aid) {
        task.group_id = task.aid;
      } else {
        task.group_id = group_id;
      }
      this.commentList(task, () => {
        callback();
      });
    });
  }
  commentList(task, callback) {
    let offset = 0,
      cycle = true,
      option;
    logger.debug(task.group_id);
    async.whilst(
			() => cycle,
			(cb) => {
  option = {
    url: `${this.settings.toutiao}${task.group_id}&offset=${offset}`
  };
  request.get(logger, option, (err, result) => {
    if (err) {
      logger.debug('今日头条评论列表请求失败', err);
      return cb();
    }
    try {
      result = JSON.parse(result.body);
    } catch (e) {
      logger.debug('今日头条评论数据解析失败');
      logger.info(result);
      return cb();
    }
    if (result.data.length <= 0) {
      cycle = false;
      return cb();
    }
    if (!task.lastId) {
      task.lastId = result.data[0].comment.id;
      task.lastTime = result.data[0].comment.create_time;
    }
    this.deal(task, result.data, (err) => {
      if (task.isEnd) {
        return callback();
      }
      offset += 50;
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
    task.cNum += length;
    async.whilst(
			() => index < length,
			(cb) => {
  if (task.commentId == comments[index].comment.id || task.commentTime >= comments[index].comment.create_time) {
    task.isEnd = true;
    task.cNum = parseInt(task.commentNum) + parseInt(index == 0 ? index : index + 1);
    task.addCount = task.cNum - task.commentNum;
    return callback();
  }
  comment = {
    cid: comments[index].comment.id,
    content: Utils.stringHandling(comments[index].comment.text),
    platform: task.p,
    bid: task.bid,
    aid: task.aid,
    ctime: comments[index].comment.create_time,
    support: comments[index].comment.digg_count,
    step: '',
    reply: comments[index].comment.reply_count,
    c_user: {
      uid: comments[index].comment.user_id,
      uname: comments[index].comment.user_name,
      uavatar: comments[index].comment.user_profile_image_url
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
