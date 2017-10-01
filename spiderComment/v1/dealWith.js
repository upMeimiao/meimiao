/**
* Created by junhao on 2017/2/10.
*/
const async = require('neo-async');
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
    this.commentList(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  commentList(task, callback) {
    let lastId = 0, cycle = true, time = null;
    const option = {
      url: this.settings.v1,
      headers: {
        'User-Agent': 'V1_vodone/6.1.2 (iPhone; iOS 10.3.2; Scale/3.00)',
        'Content-Type': 'multipart/form-data; boundary=Boundary+44C47EA48862ADB4'
      },
      data: {
        type: 1,
        vid: task.aid
      }
    };
    async.whilst(
      () => cycle,
      (cb) => {
        option.data.last_id = lastId;
        // logger.debug(option.url);
        request.post(logger, option, (err, result) => {
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
          if (!result.body || !result.body.data || !result.body.data.length) {
            cycle = false;
            cb();
            return;
          }
          time = new Date(result.body.data[0].create_time);
          if (!task.lastId) {
            task.lastId = result.body.data[0].comment_id;
            task.lastTime = moment(time).format('X');
          }
          if (task.lastTime && task.lastTime >= time) {
            task.lastTime = task.commentTime;
            task.lastId = task.commentId;
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.body.data, () => {
            if (task.isEnd) {
              cycle = false;
            }
            lastId = result.body.data[result.body.data.length - 1].comment_id;
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
        time = new Date(comments[index].create_time);
        time = moment(time).format('X');
        if (task.commentId == comments[index].commentId || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].comment_id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          c_user: {
            uid: comments[index].userid || '',
            uname: comments[index].nickname || '',
            uavatar: comments[index].picture || ''
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
