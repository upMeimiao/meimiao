/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request');
const async = require('async');
const Utils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');

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
    this.totalPage(task, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      if (result === 'add_0') {
        callback(null);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `${this.settings.ku6 + task.aid}&pn=1`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('ku6评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('ku6评论数据解析失败');
        logger.info(result.body);
        callback(e);
        return;
      }
      task.cNum = result.data.count;
      if ((task.cNum - task.commentNum) <= 0 || result.data.list.length <= 0) {
        callback(null, 'add_0');
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20);
      }
      task.lastTime = result.data.list[0].commentCtime.toString().substring(0, 10);
      task.lastId = result.data.list[0].id;
      task.addCount = task.cNum - task.commentNum;
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
          url: `${this.settings.ku6 + task.aid}&pn=${page}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('ku6评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('ku6评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.data.list, () => {
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
    let length = comments.length,
      index = 0,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId == comments[index].id || task.commentTime >= comments[index].commentCtime.toString().substring(0, 10)) {
          task.isEnd = true;
          length = 0;
          callback();
          return;
        }
        this.getAvatar(comments[index].commentAuthorId, (err, result) => {
          comment = {
            cid: comments[index].id,
            content: Utils.stringHandling(comments[index].commentContent),
            platform: task.p,
            bid: task.bid,
            aid: task.aid,
            ctime: comments[index].commentCtime.toString().substring(0, 10),
            support: comments[index].commentCount,
            c_user: {
              uid: comments[index].commentAuthorId,
              uname: comments[index].commentAuthor,
              uavatar: result
            }
          };
          Utils.commentCache(this.core.cache_db, comment);
          // Utils.saveCache(this.core.cache_db,'comment_cache',comment)
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getAvatar(uid, callback) {
    const option = {
      url: `http://boke.ku6.com/${uid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('用户主页请求失败');
      }
      const $ = cheerio.load(result.body),
        avatar = $('a.headPhoto>img').attr('src');
      callback(null, avatar);
    });
  }
}
module.exports = dealWith;
