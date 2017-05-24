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
      url: `${this.settings.souhu.topicId}http://my.tv.sohu.com/pl/${task.bid}/${task.aid}.shtml&topic_source_id=bk${task.aid}`
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
      task.cNum = result.cmt_sum;
      if ((task.cNum - task.commentNum) <= 0 || result.comments.length <= 0) {
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
      task.lastTime = result.comments[0].create_time / 1000;
      task.lastId = result.comments[0].comment_id;
      task.addCount = task.cNum - task.commentNum;
      task.topicId = result.topic_id;
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
          url: `${this.settings.souhu.list}${task.topicId}&page_no=${page}&_=${new Date().getTime()}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('搜狐评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('搜狐评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.comments, () => {
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
        if (task.commentId == comments[index].comment_id || task.commentTime >= comments[index].create_time / 1000) {
          task.isEnd = true;
          callback();
          return;
        }
        logger.debug(comments[index].passport.profile_url);
        comment = {
          cid: comments[index].comment_id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].create_time / 1000,
          support: comments[index].support_count,
          step: comments[index].floor_count,
          reply: comments[index].reply_count,
          c_user: {
            uid: comments[index].passport.profile_url ? comments[index].passport.profile_url.match(/user\/(\d)*/)[1] : null,
            uname: comments[index].passport.nickname,
            uavatar: comments[index].passport.img_url
          }
        };
        if (!comment.c_user.uid) {
          delete comment.c_user.uid;
        }
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
