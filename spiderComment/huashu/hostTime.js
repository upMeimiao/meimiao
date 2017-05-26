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
    this.getSid(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, 0, 0);
    });
  }
  getSid(task, callback) {
    const option = {
      url: this.settings.huashu.getSid + task.bid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('华数的sid请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('华数的sid数据解析失败');
        logger.info(result.body);
        callback(e);
        return;
      }
      this.total(task, result[1].aggData[0].aggRel.video_sid, (error, data) => {
        if (error) {
          callback(err);
          return;
        }
        callback(null, data);
      });
    });
  }
  total(task, sid, callback) {
    const option = {
        url: `${this.settings.huashu.topicId + sid}&_=${new Date().getTime()}`
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('华数网的评论总数请求失败');
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('华数网数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      task.topicId = result.topic_id;
      async.parallel(
        {
          time: (cb) => {
            this.getTime(task, () => {
              cb(null, '最新的评论数据完成');
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
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 10 === 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
      option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `${this.settings.huashu.list + task.topicId}&page_no=${page}&_=${new Date().getTime()}`
        };
        logger.debug(option.url);
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('华数网评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('华数网评论数据解析失败');
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
          cid: comments[index].comment_id,
          content: Utils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].create_time / 1000,
          support: comments[index].support_count,
          reply: comments[index].reply_count,
          step: comments[index].floor_count,
          c_user: {
            uid: comments[index].user_id,
            uname: comments[index].passport.nickname,
            uavatar: comments[index].passport.img_url
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