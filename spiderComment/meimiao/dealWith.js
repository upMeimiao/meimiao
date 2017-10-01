/**
* Created by zhupenghui on 2017/5/18.
*/
const async = require('neo-async');
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
    this.getCommentList(task, () => {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getCommentList(task, callback) {
    const option = {
      ua: 2
    };
    let cycle = true, cursor = '';
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.meimiao}topic_id=${task.aid}&size=20&cursor=${cursor}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('评论列表解析失败', result.body);
            cb();
            return;
          }
          if (Number(result.code) !== 200 || !result.data.list.length) {
            task.lastId = task.commentId;
            task.lastTime = task.commentTime;
            cycle = false;
            cb();
            return;
          }
          if (!task.cNum) {
            task.cNum = result.data.total;
            if (Number(task.cNum) - Number(task.commentNum) <= 0) {
              task.lastId = task.commentId;
              task.lastTime = task.commentTime;
              cycle = false;
              cb();
              return;
            }
            if (Number(task.cNum) - Number(task.commentNum) > 0) {
              task.addCount = Number(task.cNum) - Number(task.commentNum);
            }
            task.lastId = `${task.aid}_${result.data.list[0].comment_id}`;
            task.lastTime = result.data.list[0].create_time;
          }
          this.deal(task, result.data.list, () => {
            if (task.isEnd) {
              cycle = false;
            }
            cursor = result.data.cursor;
            cb();
          });
        });
      },
      () => callback()
    );
  }
  deal(task, comments, callback) {
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        time = comments[index].create_time;
        if (task.commentId == `${task.aid}_${comments[index].comment_id}` || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: `${task.aid}_${comments[index].comment_id}`,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: '',
          reply: '',
          c_user: {
            uid: comments[index].user.user_id,
            uname: comments[index].user.nickname,
            uavatar: comments[index].user.avatar
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_cache', comment);
        index += 1;
        cb();
      },
      () => callback()
    );
  }
}

module.exports = dealWith;
