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
    async.parallel(
      {
        hot: (cb) => {
          this.getHot(task, (err, result) => {
            cb(null, '热门评论数据完成');
          });
        },
        time: (cb) => {
          this.totalPage(task, (err, result) => {
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
    let option = {
        url: `${this.settings.tv56.total}${task.aid}&topic_url=http://my.tv.sohu.com/us/${task.bid}/${task.aid}.shtml&_=${new Date().getTime()}`
      },
      total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('tv56评论总量请求失败', err);
        return this.totalPage(task, callback);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('tv56评论数据解析失败');
        logger.info(result.body);
        return this.totalPage(task, callback);
      }
      this.deal(task, result.hots, (err) => {
        callback();
      });
    });
  }
  totalPage(task, callback) {
    let option = {
        url: `${this.settings.tv56.total}${task.aid}&topic_url=http://my.tv.sohu.com/us/${task.bid}/${task.aid}.shtml&_=${new Date().getTime()}`
      },
      total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('tv56评论总量请求失败', err);
        return this.totalPage(task, callback);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('tv56评论数据解析失败');
        logger.info(result.body);
        return this.totalPage(task, callback);
      }
      task.topic_id = result.topic_id;
      this.getTime(task, (err) => {
        callback();
      });
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 10 == 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
      option;
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.tv56.list}${task.topic_id}&page_no=${page}&_${new Date().getTime()}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('tv56评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('tv56评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.comments.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.comments, (err) => {
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
                cid: comments[index].comment_id,
                content: Utils.stringHandling(comments[index].content),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].create_time / 1000,
                support: comments[index].support_count,
                step: comments[index].oppose_count,
                c_user: {
                  uid: comments[index].passport.user_id,
                  uname: comments[index].passport.nickname,
                  uavatar: comments[index].passport.img_url
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