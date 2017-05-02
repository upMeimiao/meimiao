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
              callback(null, task.hostTotal, task.timeTotal);
            }
        );
  }
  getHot(task, callback) {
    let page = 0;
    const total = Number(this.settings.commentTotal) % 10 === 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
      option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option.url = `${this.settings.baofeng.hot + task.bid}&page=${page}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('暴风网评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('暴风网评论数据解析失败');
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
    const total = Number(this.settings.commentTotal) % 10 === 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
      option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option.url = `${this.settings.baofeng.time + task.bid}&page=${page}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('暴风网评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('暴风网评论数据解析失败');
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
    async.whilst(
            () => index < length,
            (cb) => {
              comment = {
                cid: comments[index].id,
                content: Utils.stringHandling(comments[index].yestxt),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].addtime,
                c_user: {
                  uid: comments[index].uid,
                  uname: comments[index].username,
                  uavatar: comments[index].faceimg
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