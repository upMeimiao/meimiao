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
    this.getTime(task, () => {
      callback();
    });
  }
  getTime(task, callback) {
    let page = 1;
    const total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option.url = `${this.settings.mgtv + task.aid}&pageCount=${page}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('芒果评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('芒果评论数据解析失败');
                  logger.info(result);
                  cb();
                  return;
                }
                if (result.data.length <= 0) {
                  page += total;
                  cb();
                  return;
                }
                task.cNum += result.data.length;
                if (!task.lastId) {
                  task.lastId = result.data[0].commentId;
                }
                this.deal(task, result.data, () => {
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
          ctime: comments[index].created_at_origin,
          support: comments[index].liked_count,
          step: '',
          c_user: {
            uid: comments[index].id,
            uname: comments[index].screen_name,
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