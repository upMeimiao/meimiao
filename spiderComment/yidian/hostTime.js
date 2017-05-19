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
    this.getTime(task, () => {
      callback();
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 === 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option,
      lastCommentId = '';
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: this.settings.yidian + task.aid + lastCommentId
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('一点咨询评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('一点咨询评论数据解析失败');
                  logger.info(result);
                  cb();
                  return;
                }
                if (result.comments.length <= 0) {
                  page += total;
                  cb();
                  return;
                }
                this.deal(task, result.comments, () => {
                  page += 1;
                  lastCommentId = `&last_comment_id=${result.comments[result.comments.length - 1].comment_id}`;
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
      time,
      comment;
    async.whilst(
            () => index < length,
            (cb) => {
              time = new Date(comments[index].createAt);
              time = moment(time).format('X');
              comment = {
                cid: comments[index].comment_id,
                content: Utils.stringHandling(comments[index].comment),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                support: comments[index].like,
                ctime: time,
                c_user: {
                  uavatar: comments[index].profile,
                  uname: comments[index].nickname
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