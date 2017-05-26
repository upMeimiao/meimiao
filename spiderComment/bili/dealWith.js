/**
* Created by junhao on 2017/2/08.
*/
const request = require('../../lib/request');
const async = require('async');
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
      url: `${this.settings.bili.time}${task.aid}&pn=1`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('bili评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('bili评论数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      if (result.code == '12002') {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      task.cNum = result.data.page.count;
      if ((task.cNum - task.commentNum) <= 0 || !result.data.replies.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) === 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) === 0 ? total / 20 : Math.ceil(total / 20);
      }
      task.lastTime = result.data.replies[0].ctime;
      task.lastId = result.data.replies[0].rpid;
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
          url: `${this.settings.bili.time}${task.aid}&pn=${page}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('bili评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('bili评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.data.replies, () => {
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
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId == comments[index].rpid || task.commentTime >= comments[index].ctime) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].rpid,
          content: spiderUtils.stringHandling(comments[index].content.message),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].ctime,
          support: comments[index].like,
          step: '',
          c_user: {
            uid: comments[index].member.mid,
            uname: comments[index].member.uname,
            uavatar: comments[index].member.avatar
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
