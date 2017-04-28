/**
* Created by junhao on 2017/2/08.
*/
const moment = require('moment');
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
    this.totalPage(task, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      if (result === 'add_0') {
        callback();
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `${this.settings.youku.list}${task.aid}&page=1&count=100`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('优酷评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body.replace(/[\n\r]/g, ''));
      } catch (e) {
        logger.debug('优酷评论总量数据解析失败');
        logger.info(result);
        callback(err);
        return;
      }
      task.cNum = result.total;
      if ((task.cNum - task.commentNum) <= 0) {
        callback(null, 'add_0');
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 100) === 0 ? task.cNum / 100 : Math.ceil(task.cNum / 100);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 100) === 0 ? total / 100 : Math.ceil(total / 100);
      }
      task.lastTime = moment(new Date(result.comments[0].published)).format('X');
      task.lastId = result.comments[0].id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1;
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.youku.list}${task.aid}&page=${page}&count=100`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('优酷评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body.replace(/[\n\r]/g, ''));
          } catch (e) {
            logger.debug('优酷评论数据解析失败');
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
      time,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        time = new Date(comments[index].published);
        if (task.commentId === comments[index].id || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          ctime: moment(time).format('X'),
          support: '',
          step: '',
          reply: '',
          c_user: {
            uid: comments[index].user ? comments[index].user.id : '',
            uname: comments[index].user ? comments[index].user.name : ''
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_cache', comment);
        index += 1;
        cb();
      },
      () => {
        callback(null);
      }
    );
  }
}
module.exports = dealWith;
