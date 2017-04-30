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
    this.getTime(task, (err) => {
      callback();
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {},
      commentId = '';
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.meipai}${task.aid}&page=${page}`
              };
              logger.debug(option.url);
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('美拍评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('美拍评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.length <= 0) {
                  page += total;
                  return cb();
                }
                if (!task.lastId) {
                  task.lastId = result[0].id;
                  task.lastTime = result[0].created_at_origin;
                }
                this.deal(task, result, (err) => {
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
                cid: comments[index].id,
                content: Utils.stringHandling(comments[index].content),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].created_at_origin,
                support: comments[index].liked_count,
                step: '',
                c_user: {
                  uid: comments[index].user.id,
                  uname: comments[index].user.screen_name ? comments[index].user.screen_name : comments[index].user.screen_name_origin,
                  uavatar: comments[index].user.avatar ? comments[index].user.avatar : ''
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