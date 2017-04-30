/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
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
    this.getTime(task, (err, result) => {
      callback();
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option,
      length;
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.v1}${task.aid}&pageNo=${page}&_${new Date().getTime()}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('v1评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('v1评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.obj.list.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.obj.list, (err) => {
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
      time,
      comment;
    async.whilst(
            () => index < length,
            (cb) => {
              time = new Date(comments[index].createTime);
              time = moment(time).format('X');
              comment = {
                cid: comments[index].commentId,
                content: Utils.stringHandling(comments[index].comments),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: time,
                c_user: {
                  uid: comments[index].userInfo.userId,
                  uname: comments[index].userInfo.userName ? comments[index].userInfo.userName : comments[index].userInfo.nickname
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