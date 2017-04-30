/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request');
const async = require('async');
const Utils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');
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
    this.getIds(task, (err, result) => {
      if (result == 'add_0') {
        return callback(null);
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getIds(task, callback) {
    const option = {
      url: `http://www.pearvideo.com/video_${task.aid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论列表Id获取失败', err);
        return this.getIds(task, callback);
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      let postId = result.match(/postId="\d*/).toString().replace('postId="', ''),
        postUserId = result.match(/postUserId="\d*/).toString().replace('postUserId="', '');
      if (postId && postUserId) {
        this.commentList(task, postId, postUserId, (err) => {
          callback();
        });
      } else {
        logger.debug('两个Id获取失败');
        return this.getIds(task, callback);
      }
    });
  }
  commentList(task, postId, postUserId, callback) {
    let score = 0,
      option = {},
      cycle = true,
      $ = null;
    async.whilst(
			() => cycle,
			(cb) => {
  option = {
    url: `http://app.pearvideo.com/clt/page/v2/topic_comm_loading.jsp?parentId=${postId}&pageidx=2&score=${score}&postUserId=${postUserId}&mrd=${Math.random()}`
  };
  request.get(logger, option, (err, result) => {
    if (err) {
      logger.debug('梨视频评论列表请求失败', err);
      return cb();
    }
    $ = cheerio.load(result.body);
    if (!task.lastId) {
      task.lastId = $('.comm-li').first().attr('id');
      task.lastTime = $('.comm-li').first().attr('id');
      task.lastTime = this.time($('.comm-li').first().find('.date').text());
    }
    this.deal(task, $('.comm-li'), (err) => {
      score = $('.comm-li').last().attr('data-score');
      if (score == '' || score == undefined) {
        cycle = false;
        return cb();
      }
      if (task.isEnd) {
        cycle = false;
      }
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
      commentData,
      time,
      avatar,
      comment;
    task.cNum += length;
    async.whilst(
			() => index < length,
			(cb) => {
  commentData = comments.eq(index);
  time = this.time(commentData.find('.date').text());
  if (task.commentId == commentData.attr('id') || task.commentTime >= time) {
    task.isEnd = true;
    return callback();
  }
  comment = {
    cid: commentData.attr('id'),
    content: Utils.stringHandling(commentData.find('.comm-cont').text()),
    platform: task.p,
    bid: task.bid,
    aid: task.aid,
    ctime: time,
    step: commentData.find('.cai').text(),
    support: commentData.find('.zan').text(),
    reply: commentData.find('.ping').text(),
    c_user: {
      uname: commentData.find('.comm-name').text(),
      uavatar: avatar
    }
  };
				// logger.debug(comment.content)
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
  time(time) {
    let time1 = null,
      time2 = null;
    if (!time) {
      logger.debug('评论时间不存在');
      return '';
    }
    if (time.includes('刚刚')) {
      return moment().unix();
    }
    if (time.includes('分钟')) {
      time = time.replace('分钟前', '');
      time = Number(moment().unix()) - (Number(time) * 60);
      return time;
    }
    time1 = time.split(' ')[0].split('-');
    time2 = `${time.split(' ')[1]}:00`;
    if (time1.length < 3) {
      time1 = `${new Date().getFullYear()}-${time1.join('-')} `;
    }
    time = new Date(time1 + time2);
    return moment(time).format('X');
  }
}

module.exports = dealWith;
