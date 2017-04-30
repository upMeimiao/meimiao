/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');

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
      callback();
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option;
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.xinlan}&xid=${task.aid}&pid=${task.bid}&page=${page}&_${new Date().getTime()}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('新蓝评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('新蓝评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.data.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.data, (err) => {
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
                cid: comments[index]._id,
                content: Utils.stringHandling(comments[index].content),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].ctime,
                support: comments[index].like,
                c_user: {
                  uid: comments[index].user.uid,
                  uname: comments[index].user.username,
                  uavatar: comments[index].user.photo
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