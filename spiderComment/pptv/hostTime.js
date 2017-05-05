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
              callback();
            }
        );
  }
  getHot(task, callback) {
    let page = 0;
    const total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {};
    async.whilst(
            () => page < total,
            (cb) => {
              option.url = `http://apicdn.sc.pptv.com/sc/v3/pplive/ref/vod_${task.aid}/topfeed/list?appplt=web&action=1&pn=0&ps=20&from=web&version=1.0.0&format=jsonp&pn=${page}`;
              logger.debug(option.url);
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('pptv评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('pptv评论数据解析失败');
                  logger.info(result);
                  cb();
                  return;
                }
                if (result.data.page_list.length <= 0) {
                  page += total;
                  cb();
                  return;
                }
                this.deal(task, result.data.page_list, () => {
                  page += 1;
                  callback();
                });
              });
            },
            () => {
              callback();
            }
        );
  }
  getTime(task, callback) {
    let page = 0;
    const total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `http://apicdn.sc.pptv.com/sc/v3/pplive/ref/vod_${task.aid}/feed/list?appplt=web&action=1&pn=${page}&ps=20&from=web&version=1.0.0`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('pptv评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('pptv评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.page_list.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data.page_list, () => {
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
          ctime: comments[index].create_time / 1000,
          support: comments[index].up_ct,
          reply: comments[index].reply_ct,
          c_user: {
            uname: comments[index].user.nick_name,
            uavatar: comments[index].user.icon
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