/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
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
    async.parallel(
      {
        hot: (cb) => {
          this.getHot(task, () => {
            cb(null, '热门评论完成');
          });
        },
        time: (cb) => {
          this.getTime(task, () => {
            cb(null, '最新评论完成');
          });
        }
      },
            (err, result) => {
              logger.debug('result: ', result);
              callback();
            }
        );
  }
  getHot(task, callback) {
    let page = 1, offset = 0,
      total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20);
    const option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option.url = `http://sdk.comment.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/${task.aid}008535RB/comments/hotList?limit=20&headLimit=1&tailLimit=2&offset=${offset}&ibc=jssdk`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  if (err.status === 404) {
                    total = -1;
                  }
                  logger.debug('网易评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('网易评论数据解析失败');
                  logger.info(result);
                  cb();
                  return;
                }
                if (result.commentIds.length <= 0) {
                  page += total;
                  cb();
                  return;
                }
                this.deal(task, result, () => {
                  page += 1;
                  offset += 20;
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
    let page = 1, offset = 0,
      total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20);
    const option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option.url = `http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/${task.aid}008535RB/app/comments/newList?offset=${offset}&limit=20`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  if (err.status === 404) {
                    total = -1;
                  }
                  logger.debug('网易评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('网易评论数据解析失败');
                  logger.info(result);
                  cb();
                  return;
                }
                if (result.commentIds.length <= 0) {
                  page += total;
                  cb();
                  return;
                }
                this.deal(task, result, () => {
                  page += 1;
                  offset += 20;
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
    const cidArr = [];
    let index = 0,
      time,
      comment,
      commentData;
    for (const key in comments.comments) {
      cidArr.push(key);
    }
    async.whilst(
            () => index < cidArr.length,
            (cb) => {
              commentData = comments.comments[cidArr[index]];
              time = new Date(commentData.createTime);
              time = moment(time).format('X');
              comment = {
                cid: commentData.commentId,
                content: spiderUtils.stringHandling(commentData.content),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: time,
                support: commentData.vote,
                step: commentData.against,
                reply: commentData.favCount,
                c_user: {
                  uname: commentData.user.nickname,
                  uavatar: commentData.user.avatar
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