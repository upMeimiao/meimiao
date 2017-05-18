/**
 * Created by dell on 2017/3/9.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const jsonp = function (data) {
  return data;
};
let logger;
class hostTime {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = spiderCore.settings.logger;
  }
  todo(task, callback) {
    task.hostTotal = 0;
    task.timeTotal = 0;
    this.getTime(task, (err) => {
      if (err) {
        callback(err);
      } else {
        callback();
      }
    });
  }
  getTime(task, callback) {
    const total = Number(this.settings.commentTotal) % 20 === 0 ?
      Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {};
    let page = 1;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.le.list}${task.aid}&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('乐视评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('乐视评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data, () => {
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
        comment = {
          cid: comments[index]._id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].ctime,
          support: comments[index].like,
          reply: comments[index].replynum,
          c_user: {
            uid: comments[index].user.uid,
            uname: comments[index].user.username,
            uavatar: comments[index].user.photo
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
        index += 1;
        cb();
      },
      () => {
        callback();
      }
  );
  }
}
module.exports = hostTime;