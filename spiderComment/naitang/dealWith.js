/**
* Created by zhupenghui on 2017/7/4.
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
    this.getTotalList(task, () => {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getTotalList(task, callback) {
    const option = {
      url: `${this.settings.naitang + task.aid}&start=0`,
      ua: 3,
      own_ua: 'Toffee/2.3.0 (iPhone; iOS 10.3.2; Scale/3.00)'
    };
    let length = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        this.getTotalList(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论列表解析失败', result.body);
        this.getTotalList(task, callback);
        return;
      }
      if (!result.data || !result.data.list.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      task.cNum = result.data.total;
      if (Number(task.cNum) - Number(task.commentNum) <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (Number(task.cNum) - Number(task.commentNum) > 0) {
        length = Number(task.cNum) - Number(task.commentNum);
      }
      task.lastId = result.data.list[0].msgid;
      task.lastTime = result.data.list[0].createline;
      task.addCount = length;
      this.commentList(task, () => {
        callback();
      });
    });
  }
  commentList(task, callback) {
    const option = {
      ua: 3,
      own_ua: 'Toffee/2.3.0 (iPhone; iOS 10.3.2; Scale/3.00)'
    };
    let pageTotal = Number(task.addCount) % 12 === 0 ?
        Number(task.addCount / 12) : Math.ceil(Number(task.addCount / 12)),
      start = 0, page = 1;
    async.whilst(
      () => page <= pageTotal,
      (cb) => {
        option.url = `${this.settings.naitang + task.aid}&start=${start}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('列表解析失败', result.body);
            cb();
            return;
          }
          this.deal(task, result.data.list, () => {
            if (task.isEnd) {
              pageTotal = -1;
            }
            page += 1;
            start += 12;
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
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        time = comments[index].createline;
        if (task.commentId == comments[index].cid || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].msgid,
          content: spiderUtils.stringHandling(comments[index].title),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: '',
          reply: '',
          c_user: {
            uid: comments[index].userid,
            uname: comments[index].nickname,
            uavatar: comments[index].img
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
