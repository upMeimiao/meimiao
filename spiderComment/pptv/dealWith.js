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
      url: `http://apicdn.sc.pptv.com/sc/v3/pplive/ref/vod_${task.aid}/feed/list?appplt=web&action=1&pn=0&ps=20&from=web&version=1.0.0`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('pptv的评论总数请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('pptv数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      task.cNum = result.data.total;
      if ((task.cNum - task.commentNum) <= 0 || result.data.page_list.length <= 0) {
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
      const comment = result.data.page_list[0];
      task.lastTime = comment.create_time / 1000;
      task.lastId = comment.id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 0;
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `http://apicdn.sc.pptv.com/sc/v3/pplive/ref/vod_${task.aid}/feed/list?appplt=web&action=1&pn=${page}&ps=20&from=web&version=1.0.0`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('pptv评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('pptv评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.data.page_list, () => {
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
    let length = comments.length,
      index = 0,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId == comments[index].id || task.commentTime >= comments[index].create_time / 1000) {
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
          ctime: comments[index].create_time / 1000,
          support: comments[index].up_ct,
          reply: comments[index].reply_ct,
          c_user: {
            uname: comments[index].user.nick_name,
            uavatar: comments[index].user.icon
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
