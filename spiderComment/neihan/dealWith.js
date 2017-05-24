/**
* Created by junhao on 2017/2/10.
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
      url: `${this.settings.neihan}${task.aid}&offset=0`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('内涵评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('内涵评论数据解析失败');
        logger.info(result.body);
        callback(e);
        return;
      }
      task.cNum = result.total_number;
      if ((task.cNum - task.commentNum) <= 0 || result.data.recent_comments.length <= 0) {
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
      task.lastTime = result.data.recent_comments[0].create_time;
      task.lastId = result.data.recent_comments[0].comment_id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1,
      offset = 0,
      option;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `${this.settings.neihan}${task.aid}&offset=${offset}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('内涵评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('内涵评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.data.recent_comments, () => {
            if (task.isEnd) {
              total = -1;
              cb();
              return;
            }
            page += 1;
            offset += 20;
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
        if (task.commentId == comments[index].id || task.commentTime >= comments[index].create_time) {
          task.isEnd = true;
          length = 0;
          cb();
          return;
        }
        comment = {
          cid: comments[index].comment_id,
          content: spiderUtils.stringHandling(comments[index].text),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].create_time,
          support: comments[index].digg_count,
          step: comments[index].bury_count,
          c_user: {
            uid: comments[index].user_id,
            uname: comments[index].user_name,
            uavatar: comments[index].avatar_url
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
