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
    this.totalPage(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `${this.settings.budejie}${task.aid}&page=1`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('不得姐评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('不得姐评论数据解析失败');
        logger.info(result.body);
        callback(e);
        return;
      }
      if (result == '' || result.total == 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      task.cNum = result.total;
      if ((task.cNum - task.commentNum) <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 5) === 0 ? task.cNum / 5 : Math.ceil(task.cNum / 5);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 5) === 0 ? total / 5 : Math.ceil(total / 5);
      }
      const time = new Date(result.data[0].ctime);
      task.lastTime = moment(time).format('X');
      task.lastId = result.data[0].id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1,
      cycle = true,
      option;
    async.whilst(
      () => cycle,
      (cb) => {
        option = {
          url: `${this.settings.budejie}${task.aid}&page=${page}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('不得姐评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('不得姐评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (!result || !result.data) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.data, () => {
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
      comment,
      time;
    async.whilst(
      () => index < length,
      (cb) => {
        time = new Date(comments[index].ctime);
        time = moment(time).format('X');
        if (task.commentId == comments[index].id || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        if (!comments[index].content) {
          index += 1;
          cb();
          return;
        }
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          support: comments[index].like_count,
          c_user: {
            uid: comments[index].user.id,
            uname: comments[index].user.username,
            uavatar: comments[index].user.profile_image
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
