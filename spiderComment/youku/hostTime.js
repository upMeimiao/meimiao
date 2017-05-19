/**
 * Created by dell on 2017/3/9.
 */
const async = require('async');
const crypto = require('crypto');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const sign = (e) => {
  const md5 = crypto.createHash('md5');
  return md5.update(`100-DDwODVkv&6c4aa6af6560efff5df3c16c704b49f1&${e}`).digest('hex');
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
    const option = {},
      time = parseInt(new Date().getTime() / 1000);
    let total = this.settings.commentTotal % 30 === 0 ?
        this.settings.commentTotal / 30 : Math.ceil(this.settings.commentTotal / 30),
      page = 1;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.youku.list}${task.aid}&currentPage=${page}&sign=${sign(time)}&time=${time}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('热门评论请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('热门评论解析失败', result.body);
            cb();
            return;
          }
          if (result.code && result.code == -4) {
            cb();
            return;
          }
          if (!result.data.hot || result.data.hot.length <= 0) {
            total = -1;
            cb();
            return;
          }
          this.deal(task, result.data.hot, () => {
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
     total = this.settings.commentTotal % 100 === 0 ?
        this.settings.commentTotal / 100 : Math.ceil(this.settings.commentTotal / 100);
    const option = {},
      time = parseInt(new Date().getTime() / 1000);
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.youku.list}${task.aid}&currentPage=${page}&sign=${sign(time)}&time=${time}`;
        logger.debug(option.url)
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('优酷评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body.replace(/[\n\r]/g, ''));
          } catch (e) {
            logger.debug('优酷评论数据解析失败', result.body);
            cb();
            return;
          }
          if (result.code && result.code == -4) {
            cb();
            return;
          }
          if (!result.data.comment || result.data.comment.length <= 0) {
            total = -1;
            cb();
            return;
          }
          this.deal(task, result.data.comment, () => {
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
          ctime: parseInt(comments[index].createTime / 1000),
          support: comments[index].upCount,
          step: comments[index].downCount,
          reply: comments[index].replyCount,
          c_user: {
            uid: comments[index].user ? comments[index].user.userId : comments[index].userId,
            uname: comments[index].user ? comments[index].user.userName : '',
            avatar: comments[index].user ? comments[index].user.avatarLarge : ''
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