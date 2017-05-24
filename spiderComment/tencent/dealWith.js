/**
* Created by junhao on 2017/2/09.
*/
const request = require('../../lib/request');
const async = require('async');
const spiderUtils = require('../../lib/spiderUtils');

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
    this.commentId(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  commentId(task, callback) {
    const option = {
      url: this.settings.tencent.commentId + task.aid
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        logger.debug('腾讯评论id请求失败', error);
        callback(error);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('腾讯数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      if (result.comment_id == 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      this.totalPage(task, result.comment_id, (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback();
      });
    });
  }
  totalPage(task, commentId, callback) {
    const option = {
      url: `https://coral.qq.com/article/${commentId}/comment?reqnum=20&commentid=0`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('腾讯评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('腾讯评论数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      if (result.errCode != 0) {
        callback();
        return;
      }
      task.cNum = result.data.total;
      if ((task.cNum - task.commentNum) <= 0) {
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
      if (result.data.commentid.length === 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      task.lastId = result.data.commentid[0].id;
      task.lastTime = result.data.commentid[0].time;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, commentId, () => {
        callback();
      });
    });
  }
  commentList(task, total, commentId, callback) {
    let page = 1,
      lastId = 0,
      option;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `https://coral.qq.com/article/${commentId}/comment?reqnum=20&commentid=${lastId}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('腾讯评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('腾讯评论数据解析失败', result);
            cb();
            return;
          }
          this.deal(task, result.data.commentid, () => {
            if (task.isEnd) {
              callback();
              return;
            }
            lastId = result.data.last;
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
        if (task.commentId == comments[index].id || task.commentTime >= comments[index].time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].time,
          support: comments[index].up,
          step: comments[index].poke,
          c_user: {
            uid: comments[index].userinfo.userid,
            uname: comments[index].userinfo.nick,
            uavatar: comments[index].userinfo.head
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