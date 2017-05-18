/**
 * Created by dell on 2017/3/9.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

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
    const total = this.settings.commentTotal % 20 === 0 ?
        this.settings.commentTotal / 20 : Math.ceil(this.settings.commentTotal / 20),
      option = {};
    let page = 1;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.iqiyi.hot}${task.aid}&tvid=${task.aid}&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('爱奇艺评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('爱奇艺评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.comments.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data.comments, () => {
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
    const total = this.settings.commentTotal % 20 === 0 ?
        this.settings.commentTotal / 20 : Math.ceil(this.settings.commentTotal / 20),
      option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.iqiyi.list}${task.aid}&tvid=${task.aid}&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('爱奇艺评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('爱奇艺评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.comments.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data.comments, () => {
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
          cid: comments[index].contentId,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].addTime,
          support: comments[index].counterList.likes,
          step: comments[index].counterList.downs,
          reply: comments[index].counterList.replies,
          c_user: {
            uid: comments[index].userInfo.uid,
            uname: comments[index].userInfo.uname,
            uavatar: comments[index].userInfo.icon
          }
        };
        // spiderUtils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
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