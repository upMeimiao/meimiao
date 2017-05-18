/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const crypto = require('crypto');

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
    this.getTime(task, () => {
      callback(null, 0, 0);
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 10 === 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
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
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('风行网评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.comment.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data.comment, () => {
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
      comment,
      cid,
      md5;
    async.whilst(
      () => index < length,
      (cb) => {
        md5 = crypto.createHash('md5');
        cid = md5.update(task.bid + comments[index].user_id + comments[index].time).digest('hex');
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