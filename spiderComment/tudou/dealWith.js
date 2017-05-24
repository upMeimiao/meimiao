/* eslint-disable no-bitwise */
/**
* Created by junhao on 2017/2/08.
*/
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const crypto = require('crypto');

const sign = (e) => {
  const md5 = crypto.createHash('md5');
  return md5.update(`700-cJpvjG4g&bad4543751cacf3322ab683576474e31&${e}`).digest('hex');
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
    this.totalPage(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    const option = {},
      time = new Date().getTime().toString().substring(0, 10);
    let total = 0;
    option.url = `${this.settings.tudou.commentId}${task.aid}&objectType=1&listType=0&currentPage=1&pageSize=30&sign=${sign(time)}&time=${time}`;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('土豆评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('土豆评论数据解析失败', result.body);
        callback(e);
        return;
      }
      task.cNum = result.data.totalSize;
      if ((task.cNum - task.commentNum) <= 0 || result.data.length <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback(null);
        return;
      }
      total = (task.cNum % 30) === 0 ? task.cNum / 30 : Math.ceil(task.cNum / 30);
      if ((task.cNum - task.commentNum) > 0) {
        total = task.cNum - task.commentNum;
        total = (total % 30) === 0 ? total / 30 : Math.ceil(total / 30);
      }
      task.lastTime = parseInt(result.data.comment[0].createTime / 1000, 10);
      task.lastId = result.data.comment[0].id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    const option = {};
    let page = 1,
      time;
    async.whilst(
      () => page <= Math.min(total, 400),
      (cb) => {
        time = new Date().getTime().toString().substring(0, 10);
        option.url = `${this.settings.tudou.commentId}${task.aid}&objectType=1&listType=0&currentPage=${page}&pageSize=30&sign=${sign(time)}&time=${time}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('土豆评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('土豆评论列表数据解析失败', result.body);
            cb();
            return;
          }
          result = result.data.comment;
          this.deal(task, result, () => {
            if (task.isEnd) {
              total = 0;
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
        if (task.commentId == comments[index].id || task.commentTime >= parseInt(comments[index].createTime / 1000, 10)) {
          logger.debug('---');
          task.isEnd = true;
          length = 0;
          cb();
          return;
        }
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: parseInt(comments[index].createTime / 1000, 10),
          support: comments[index].upCount,
          step: comments[index].downCount,
          reply: comments[index].replyCount,
          c_user: {
            uid: comments[index].user.userId,
            uname: comments[index].user.userName,
            uavatar: comments[index].user.avatarMiddle
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
