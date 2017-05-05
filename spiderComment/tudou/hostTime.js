/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
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
    this.commentId(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback();
    });
  }
  commentId(task, callback) {
    const option = {
      url: this.settings.tudou.commentId + task.aid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('土豆的评论Id请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('土豆的id数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      task.commentId = result.result.vid;
      async.parallel(
        {
          hot: (cb) => {
            this.getHot(task, () => {
              cb(null, '热门评论数据完成');
            });
          },
          time: (cb) => {
            this.getTime(task, () => {
              cb(null, '最新评论数据完成');
            });
          }
        },
        (error, data) => {
          logger.debug('result: ', data);
          callback();
        }
      );
    });
  }
  getHot(task, callback) {
    let page = 1;
    const total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option.url = `${this.settings.tudou.list + task.commentId}&method=getHotCmt&page=${page}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('土豆评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('土豆评论数据解析失败');
                  logger.info(result);
                  cb();
                  return;
                }
                if (result.data.length <= 0) {
                  page += total;
                  cb();
                  return;
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
  getTime(task, callback) {
    let page = 1;
    const total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option.url = `${this.settings.tudou.list + task.commentId}&method=getCmt&page=${page}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('土豆评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('土豆评论数据解析失败');
                  logger.info(result);
                  cb();
                  return;
                }
                if (result.data.length <= 0) {
                  page += total;
                  cb();
                  return;
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
    logger.debug(length);
    async.whilst(
      () => index < length,
      (cb) => {
        comment = {
          cid: comments[index].commentId,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].publish_time / 1000,
          support: '',
          c_user: {
            uid: comments[index].userID,
            uname: comments[index].username,
            uavatar: comments[index].userpic
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
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