/**
 * Created by dell on 2017/3/9.
 */
const async = require('async');
const moment = require('moment');
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
    this.getCommentId(task, (err) => {
      if (err) {
        callback(err);
      } else {
        callback();
      }
    });
  }
  getCommentId(task, callback) {
    const option = {
      url: `${this.settings.youku.commentId}${task.aid}&time=${new Date().getTime()}`
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        logger.debug('优酷的评论id请求失败');
        callback(error);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('优酷评论Id数据解析失败');
        callback(e);
        return;
      }
      task.commentId = result.data.id;
      async.parallel(
        {
          // hot: (cb) => {
          //   this.getHot(task, () => {
          //     cb(null, '热门评论完成');
          //   });
          // },
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
    });
  }
  getHot(task, callback) {
    const total = this.settings.commentTotal % 20 === 0 ?
        this.settings.commentTotal / 20 : Math.ceil(this.settings.commentTotal / 20);
    let option;
    const page = 1;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = '';
      },
      (err, result) => {

      }
    );
  }
  getTime(task, callback) {
    let page = 1;
    const total = this.settings.commentTotal % 100 === 0 ?
        this.settings.commentTotal / 100 : Math.ceil(this.settings.commentTotal / 100),
      option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.youku.list}${task.aid}&page=${page}&count=100`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('优酷评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body.replace(/[\n\r]/g, ''));
          } catch (e) {
            logger.debug('优酷评论数据解析失败');
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
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          ctime: moment(new Date(comments[index].published)).format('X'),
          support: '',
          step: '',
          reply: '',
          c_user: {
            uid: comments[index].user ? comments[index].user.id : '',
            uname: comments[index].user ? comments[index].user.name : ''
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