/**
* Created by zhupenghui on 2017/5/24.
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
    this.totalPage(task, () => {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `https://api.huoshan.com/hotsoon/item/${task.aid}/comments/?aid=1112&os_version=10.3.1&app_name=live_stream&device_type=iPhone8,2&version_code=2.1.0&count=20&offset=0`,
      ua: 2
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        this.totalPage(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论列表解析失败', result.body);
        this.totalPage(task, callback);
        return;
      }
      task.cNum = result.extra.total;
      if (Number(task.cNum) - Number(task.commentNum) <= 0 || !result.data.comments.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (Number(task.cNum) - Number(task.commentNum) > 0) {
        total = Number(task.cNum) - Number(task.commentNum);
        total = total % 20 === 0 ? total / 20 : Math.ceil(total / 20);
      }
      task.lastId = result.data.comments[0].id;
      task.lastTime = result.data.comments[0].create_time;
      task.addCount = Number(task.cNum) - Number(task.commentNum);
      this.commentList(task, () => {
        callback();
      });
    });
  }
  commentList(task, callback) {
    const option = {
      ua: 2
    };
    let cycle = true,
      offset = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `https://api.huoshan.com/hotsoon/item/${task.aid}/comments/?&os_version=10.3.1&app_name=live_stream&device_type=iPhone8,2&version_code=2.1.0&count=20&offset=${offset}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('评论列表请求错误', err);
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
          if (!result.data.comments.length) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.data.comments, () => {
            if (task.isEnd) {
              cycle = false;
            }
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
    let index = 0,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        if (task.commentId == comments[index].id || task.commentTime >= comments[index].create_time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].text),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].create_time,
          step: '',
          support: comments[index].digg_count,
          reply: '',
          c_user: {
            uid: comments[index].user.id,
            uname: comments[index].user.nickname,
            uavatar: comments[index].user.avatar_large.uri
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
