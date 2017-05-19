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
            (err, result) => {
              logger.debug('result: ', result);
              callback(null, 0, 0);
            }
        );
  }
  getHot(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20);
    const option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option.url = `${this.settings.bili.hot}${task.aid}&pn=${page}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('bili评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('bili评论数据解析失败');
                  logger.info(result);
                  cb();
                  return;
                }
                if (result.code == '12002') {
                  total = -1;
                  cb();
                  return;
                }
                if (result.data.replies.length <= 0) {
                  page = total + 1;
                  cb();
                  return;
                }
                this.deal(task, result.data.replies, () => {
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
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 === 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20);
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.bili.time}${task.aid}&pn=${page}`;
        logger.debug(option.url)
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('bili评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('bili评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.code == '12002') {
            total = -1;
            cb();
            return;
          }
          if (result.data.replies.length <= 0) {
            page = total + 1;
            cb();
            return;
          }
          this.deal(task, result.data.replies, () => {
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
                cid: comments[index].rpid,
                content: Utils.stringHandling(comments[index].content.message),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].ctime,
                support: comments[index].like,
                step: '',
                c_user: {
                  uid: comments[index].member.mid,
                  uname: comments[index].member.uname,
                  uavatar: comments[index].member.avatar
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