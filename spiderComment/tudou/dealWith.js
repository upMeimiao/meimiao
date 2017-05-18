/**
* Created by junhao on 2017/2/08.
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
    this.commentId(task, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      if (result === 'add_0') {
        callback(null);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  commentId(task, callback) {
    const option = {
      url: this.settings.tudou.commentId + task.aid
    };
    logger.debug(option.url);
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('土豆的评论Id请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('土豆的id数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      task.commentId = result.result.vid;
      this.totalPage(task, (error) => {
        if (error) {
          callback(error);
          return;
        }
        callback();
      });
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `${this.settings.tudou.list + task.commentId}&page=1&method=getCmt`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('土豆评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('土豆评论数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      task.cNum = result.total;
      if ((task.cNum - task.commentNum) <= 0 || result.data.length <= 0) {
        callback(null, 'add_0');
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) === 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) === 0 ? total / 20 : Math.ceil(total / 20);
      }
      task.lastTime = result.data[0].publish_time / 1000;
      task.lastId = result.data[0].commentId;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
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
          url: `${this.settings.tudou.list + task.commentId}&method=getCmt&page=${page}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('土豆评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('土豆评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.data, () => {
            if (task.isEnd) {
              total = -1;
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
    let length = comments.length,
      index = 0,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId == comments[index].commentId || task.commentTime >= comments[index].publish_time / 1000) {
          task.isEnd = true;
          length = 0;
          cb();
          return;
        }
        comment = {
          cid: comments[index].commentId,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].publish_time / 1000,
          support: '',
          c_user: {
            uid: comments[index].userID,
            uname: comments[index].username,
            uavatar: comments[index].userpic
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
