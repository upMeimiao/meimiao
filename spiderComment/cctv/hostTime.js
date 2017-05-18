/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const crypto = require('crypto');
const moment = require('moment');

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
      total = Number(this.settings.commentTotal) % 10 === 0 ?
        Number(this.settings.commentTotal) / 10 :
        Math.ceil(Number(this.settings.commentTotal) / 10),
      option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `${this.settings.cctv + task.aid}&page=${page}&_${new Date().getTime()}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('cctv评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('cctv评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (!result || result == '') {
            total = 0;
            cb();
            return;
          }
          this.deal(task, result.content, () => {
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
      time,
      cid,
      md5;
    async.whilst(
      () => index < length,
      (cb) => {
        md5 = crypto.createHash('md5');
        time = new Date(comments[index].pubdate);
        time = moment(time).format('X');
        cid = md5(task.aid + comments[index].pid + time);
        comment = {
          cid,
          content: Utils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          c_user: {
            uid: comments[index].pid,
            uname: comments[index].uname
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