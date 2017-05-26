/**
* Created by junhao on 2017/2/10.
*/
const async = require('async');
const moment = require('moment');
const crypto = require('crypto');
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
    this.total(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  total(task, callback) {
    const option = {
      url: `${this.settings.cctv + task.aid}&page=1&_${new Date().getTime()}`
    };
    let total;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('cctv的评论总数请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('cctv数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      if (!result || result == '') {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      task.cNum = result.total;
      if ((task.cNum - task.commentNum) <= 0 || !result.content.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 10) === 0 ? task.cNum / 10 : Math.ceil(task.cNum / 10);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 10) === 0 ? total / 10 : Math.ceil(total / 10);
      }
      const comment = result.content[0],
        md5 = crypto.createHash('md5');
      let time = new Date(comment.pubdate);
      time = moment(time).format('X');
      task.lastTime = time;
      task.lastId = md5.update(task.aid + comment.pid + time).digest('hex');
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1;
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.cctv + task.aid}&page=${page}&_${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('cctv评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('cctv评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.content, () => {
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
      time,
      comment,
      cid,
      md5;
    async.whilst(
      () => index < length,
      (cb) => {
        md5 = crypto.createHash('md5');
        time = new Date(comments[index].pubdate);
        time = moment(time).format('X');
        cid = md5.update(task.aid + comments[index].pid + time).digest('hex');
        if (task.commentId == cid || task.commentTime >= comments[index].time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          c_user: {
            uid: comments[index].pid,
            uname: comments[index].uname
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
