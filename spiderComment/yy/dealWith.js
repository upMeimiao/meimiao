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
    const len = task.aid.split('_').length;
    if (len > 1) {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
      return;
    }
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
      md5 = crypto.createHash('md5'),
      isType = task.aid.substring(0, 1);
    let total = 0;
    if (isType == 1) {
      task.type = 4;
    } else if (isType == 9) {
      task.type = 3;
    }
    option.url = `${this.settings.yy}${task.aid}&index=0&type=${task.type}`;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('yy评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('yy评论数据解析失败');
        logger.info(result.body);
        callback(e);
        return;
      }
      task.cNum = result.data.total;
      if ((task.cNum - task.commentNum) <= 0 || !result.data.list.length) {
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
      const cid = (result.data.list[0].yyno + result.data.list[0].content);
      task.lastId = md5.update(cid).digest('hex');
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    const option = {};
    let page = 1,
      index = 0;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.yy}${task.aid}&index=${index}&type=${task.type}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('yy评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('yy评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.data.list, () => {
            if (task.isEnd) {
              callback();
              return;
            }
            page += 1;
            index += 100;
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
      cid, md5,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        md5 = crypto.createHash('md5');
        cid = md5.update(comments[index].yyno + comments[index].content).digest('hex');
        if (task.commentId == cid) {
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
          c_user: {
            uid: comments[index].yyno,
            uname: comments[index].nickname,
            uavatar: comments[index].avatar
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
