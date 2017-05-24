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
      url: this.settings.kuaibao.commentId + task.aid
    };
    let commentId;
    request.get(logger, option, (error, result) => {
      if (error) {
        logger.debug('天天快报请求评论Id失败');
        callback(error);
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      if (!result.match(/commentId="(\d*)/) || !result.match(/commentId="(\d*)/)[1]) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      commentId = result.match(/commentId="(\d*)/)[1];
      task.commentId = commentId;
      this.totalPage(task, (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback();
      });
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `http://coral.qq.com/article/${task.commentId}/comment?commentid=&reqnum=20`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('天天快报评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('天天快报评论数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      if (result.errCode !== 0) {
        callback();
        return;
      }
      task.cNum = result.data.total;
      if ((task.cNum - task.commentNum) <= 0 || result.data.commentid.length === 0) {
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
      task.lastTime = result.data.commentid[0].time;
      task.lastId = result.data.commentid[0].id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1,
      commentId = '',
      option;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `http://coral.qq.com/article/${task.commentId}/comment?commentid=${commentId}&reqnum=20`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('天天快报评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('天天快报评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.data.commentid, () => {
            if (task.isEnd) {
              callback();
              return;
            }
            page += 1;
            commentId = result.data.last;
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
          c_user: {
            uid: comments[index].userid,
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
