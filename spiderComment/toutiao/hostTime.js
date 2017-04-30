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
        logger.debug('今日头条评论id请求失败', err);
        return this.commentId(task, callback);
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('今日头条数据解析失败');
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
      option,
      offset = 0;
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.toutiao}${task.aid}&offset=${offset}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('今日头条评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('今日头条评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.data.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.data, (err) => {
                  offset += 50;
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
                cid: comments[index].comment.id,
                content: Utils.stringHandling(comments[index].comment.text),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].comment.create_time,
                support: comments[index].comment.digg_count,
                step: '',
                reply: comments[index].comment.reply_count,
                c_user: {
                  uid: comments[index].comment.user_id,
                  uname: comments[index].comment.user_name,
                  uavatar: comments[index].comment.user_profile_image_url
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