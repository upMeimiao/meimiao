/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');

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
    this.commentId(task, (err) => {
      callback();
    });
  }
  commentId(task, callback) {
    const option = {
      url: this.settings.tencent.commentId + task.aid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('腾讯评论id请求失败', err);
        return this.commentId(task, callback);
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('腾讯数据解析失败');
        logger.info(result);
        return this.commentId(task, callback);
      }
      this.getTime(task, result.comment_id, (err, result) => {
        callback(null, result);
      });
    });
  }
  getTime(task, commentId, callback) {
    let page = 0,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {},
      lastId = 0;
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `https://coral.qq.com/article/${commentId}/comment?reqnum=20&commentid=${lastId}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('乐视评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('乐视评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.data.commentid.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.data.commentid, (err) => {
                  lastId = result.data.last;
                  page++;
                  cb();
                });
              });
            },
            (err, result) => {
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
              comment = {
                cid: comments[index].id,
                content: Utils.stringHandling(comments[index].content),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].time,
                support: comments[index].up,
                step: comments[index].poke,
                c_user: {
                  uid: comments[index].userinfo.userid,
                  uname: comments[index].userinfo.nick,
                  uavatar: comments[index].userinfo.head
                }
              };
              Utils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
              index++;
              cb();
            },
            (err, result) => {
              callback();
            }
        );
  }
}
module.exports = hostTime;