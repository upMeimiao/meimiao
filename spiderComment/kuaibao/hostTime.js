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
    let option = {
        url: this.settings.kuaibao.commentId + task.aid
      },
      comment_id;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('天天快报请求评论Id失败');
        return this.commentId(task, callback);
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      comment_id = result.match(/commentId="\d*/).toString().replace('commentId="', '');
      task.commentId = comment_id;
      this.getTime(task, (err, result) => {
        callback(null, result);
      });
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {},
      commentId = '';
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `http://coral.qq.com/article/${task.commentId}/comment?commentid=${commentId}&reqnum=20`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('天天快报评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('天天快报评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.data.commentid <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.data.commentid, (err) => {
                  page++;
                  commentId = result.data.last;
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
                c_user: {
                  uid: comments[index].userid,
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