/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const md5 = require('js-md5');

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
      total = Number(this.settings.commentTotal) % 10 == 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
      option,
      index = 0;
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.yy}${task.aid}&index=${index}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('yy评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('yy评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.data.list.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.data.list, (err) => {
                  page++;
                  index += 10;
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
      cid,
      comment;
    async.whilst(
            () => index < length,
            (cb) => {
              cid = md5(comments[index].yyno + comments[index].content);
              if (task.commentId == cid) {
                task.isEnd = true;
                return callback();
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