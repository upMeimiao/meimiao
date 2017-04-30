/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const md5 = require('js-md5');

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
      callback(null, 0, 0);
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 10 == 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
      option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `http://api1.fun.tv/comment/display/gallery/${task.bid}?pg=${page}&isajax=1&dtime=${new Date().getTime()}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('风行网评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('风行网评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.data.comment.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.data.comment, (err) => {
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
      comment,
      time,
      cid;
    async.whilst(
            () => index < length,
            (cb) => {
              cid = md5(task.bid + comments[index].user_id + comments[index].time);
              comment = {
                cid,
                content: Utils.stringHandling(comments[index].content),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].time,
                support: comments[index].upCount,
                c_user: {
                  uid: comments[index].user_id,
                  uname: comments[index].nick_name,
                  uavatar: comments[index].user_icon.orig
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