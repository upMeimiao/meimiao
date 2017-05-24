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
    this.getCid(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getCid(task, callback) {
    const option = {
      url: `http://v.ifeng.com/docvlist/${task.aid}-1.js`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论ID请求失败', err);
        callback(err);
        return;
      }
      result = result.body;
      if (!result || result.length <= 0 || result.match(/404.shtml/)) {
        logger.debug('该视频已被删除', result.match(/404.shtml/)[0]);
        callback();
        return;
      }
      const startIndex = result.indexOf('var data='),
        endIndex = result.indexOf(';bsCallback.getSinglePage');
      if (startIndex === -1 || endIndex === -1) {
        logger.debug('没有评论', startIndex, '---', endIndex);
        callback();
        return;
      }
      let data = result.substring(startIndex + 9, endIndex);
      try {
        data = JSON.parse(data);
      } catch (e) {
        logger.debug('vid数据解析失败', data);
        callback(e);
        return;
      }
      this.totalPage(task, data.dataList[0].guid, (error) => {
        if (error) {
          callback(error);
          return;
        }
        callback();
      });
    });
  }
  totalPage(task, cid, callback) {
    const option = {
      url: `${this.settings.ifeng}${cid}&p=1`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('凤凰评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('凤凰评论数据解析失败');
        logger.info(result.body);
        callback(e);
        return;
      }
      task.cNum = result.count;
      if ((task.cNum - task.commentNum) <= 0 || !result.comments.newest.length) {
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
      task.lastTime = result.comments.newest[0].create_time;
      task.lastId = result.comments.newest[0].comment_id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, cid, () => {
        callback();
      });
    });
  }
  commentList(task, total, cid, callback) {
    let page = 1,
      option;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `${this.settings.ifeng}${cid}&p=${page}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('凤凰评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('凤凰评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.comments, () => {
            if (task.isEnd) {
              total = -1;
              cb(null, 'add_0');
              return;
            }
            page += 1;
            cb();
          });
        });
      },
      (err, result) => {
        callback(null, result);
      }
    );
  }
  deal(task, comments, callback) {
    let length = comments.newest.length,
      index = 0,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId == comments.newest[index].comment_id || task.commentTime >= comments.newest[index].create_time) {
          task.isEnd = true;
          length = -1;
          cb();
          return;
        }
        comment = {
          cid: comments.newest[index].comment_id,
          content: spiderUtils.stringHandling(comments.newest[index].comment_contents),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments.newest[index].create_time,
          c_user: {
            uid: comments.newest[index].user_id,
            uname: comments.newest[index].uname,
            uavatar: comments.newest[index].userFace
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
