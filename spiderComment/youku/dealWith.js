/**
* Created by junhao on 2017/2/08.
*/
const async = require('async');
const crypto = require('crypto');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const sign = (e) => {
  const md5 = crypto.createHash('md5');
  return md5.update(`100-DDwODVkv&6c4aa6af6560efff5df3c16c704b49f1&${e}`).digest('hex');
};
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
    const time = parseInt(new Date().getTime() / 1000, 10),
      option = {
        url: `${this.settings.youku.list}${task.aid}&currentPage=1&sign=${sign(time)}&time=${time}`
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
      if (result.code && result.code == -4) {
        this.totalPage(task, callback);
        return;
      }
      task.cNum = result.data.totalSize;
      if ((task.cNum - task.commentNum) <= 0 || !result.data.comment || result.data.comment.length <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 30) === 0 ? task.cNum / 30 : Math.ceil(task.cNum / 30);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 30) === 0 ? total / 30 : Math.ceil(total / 30);
      }
      task.lastTime = parseInt(result.data.comment[0].createTime / 1000, 10);
      task.lastId = result.data.comment[0].id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1;
    const option = {},
      time = parseInt(new Date().getTime() / 1000, 10);
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.youku.list}${task.aid}&currentPage=${page}&sign=${sign(time)}&time=${time}`;
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
          if (result.code && result.code == -4) {
            cb();
            return;
          }
          this.deal(task, result.data.comment, () => {
            if (task.isEnd) {
              total = -1;
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
      time,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        time = parseInt(comments[index].createTime / 1000, 10);
        if (task.commentId === comments[index].id || task.commentTime >= time) {
          task.isEnd = true;
          length = 0;
          cb();
          return;
        }
        comment = {
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          ctime: time,
          support: comments[index].upCount,
          step: comments[index].downCount,
          reply: comments[index].replyCount,
          c_user: {
            uid: comments[index].user ? comments[index].user.userId : comments[index].userId,
            uname: comments[index].user ? comments[index].user.userName : '',
            avatar: comments[index].user ? comments[index].user.avatarLarge : ''
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
