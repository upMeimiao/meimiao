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
    const len = task.aid.split('_').length;
    if (len > 1) {
      callback();
      return;
    }
    this.getTime(task, () => {
      callback();
    });
  }
  getTime(task, callback) {
    const isType = task.aid.substring(0, 1);
    let page = 1,
      option,
      index = 0;
    if (isType == 1) {
      task.type = 4;
    } else if (isType == 9) {
      task.type = 3;
    }
    const total = Number(this.settings.commentTotal) % 100 === 0 ?
      Number(this.settings.commentTotal) / 100 :
      Math.ceil(Number(this.settings.commentTotal) / 100);
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `${this.settings.yy}${task.aid}&index=${index}&type=${task.type}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('yy评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('yy评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.list.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data.list, () => {
            page += 1;
            index += 10;
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
      cid,
      comment,
      md5;
    async.whilst(
      () => index < length,
      (cb) => {
        md5 = crypto.createHash('md5');
        cid = md5.update(comments[index].yyno + comments[index].content).digest('hex');
        if (task.commentId == cid) {
          task.isEnd = true;
          length = 0;
          cb();
          return;
        }
        comment = {
          cid,
          content: Utils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          c_user: {
            uid: comments[index].yyno,
            uname: comments[index].nickname,
            uavatar: comments[index].avatar
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