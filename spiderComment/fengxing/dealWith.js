/**
* Created by junhao on 2017/2/10.
*/
const async = require('async');
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
      url: `http://api1.fun.tv/comment/display/gallery/${task.bid}?pg=1&isajax=1&dtime=${new Date().getTime()}`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('风行网的评论总数请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('风行网数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      task.cNum = result.data.total_num;
      if ((task.cNum - task.commentNum) <= 0 || result.data.comment.length <= 0) {
        task.lastTime = task.commentTime;
        task.lastId = task.commentId;
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) === 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) === 0 ? total / 20 : Math.ceil(total / 20);
      }
      const comment = result.data.comment[0],
        md5 = crypto.createHash('md5'),
        cid = md5.update(task.bid + comment.user_id + comment.time).digest('hex');
      task.lastTime = comment.time;
      task.lastId = cid;
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
        option.url = `http://api1.fun.tv/comment/display/gallery/${task.bid}?pg=${page}&isajax=1&dtime=${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('风行网评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('风行网评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.data.comment, () => {
            if (task.isEnd) {
              total = -1;
              cb();
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
      cid,
      comment,
      md5;
    async.whilst(
      () => index < length,
      (cb) => {
        md5 = crypto.createHash('md5');
        cid = md5.update(task.bid + comments[index].user_id + comments[index].time).digest('hex');
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
          ctime: comments[index].time,
          support: comments[index].upCount,
          c_user: {
            uid: comments[index].user_id,
            uname: comments[index].nick_name,
            uavatar: comments[index].user_icon.orig
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
