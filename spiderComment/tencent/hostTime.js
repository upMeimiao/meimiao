/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('neo-async');

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
    this.commentId(task, () => {
      callback();
    });
  }
  commentId(task, callback) {
    const option = {
      url: this.settings.tencent.commentId + task.aid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('腾讯评论id请求失败', err);
        this.commentId(task, callback);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('腾讯数据解析失败');
        logger.info(result);
        this.commentId(task, callback);
        return;
      }
      async.parallel(
        {
          hot: (cb) => {
            this.commentHot(task, result.comment_id, () => {
              cb();
            });
          },
          time: (cb) => {
            this.getTime(task, result.comment_id, () => {
              cb();
            });
          }
        },
        () => {
          callback();
        }
      );
    });
  }
  commentHot(task, commnentId, callback) {
    const option = {
      ua: 1
    };
    let cycle = true, lastId = '';
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `https://coral.qq.com/article/${commnentId}/hotcomment?reqnum=20&_=${new Date().getTime()}&commentid=${lastId}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('腾讯热门评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('腾讯评论热门数据解析失败', result);
            cb();
            return;
          }
          if (Number(result.errCode) !== 0 || !result.data || !result.data.commentid.length) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.data.commentid, () => {
            task.hostTotal += result.data.commentid.length;
            if (task.hostTotal >= this.settings.commentTotal) {
              cycle = false;
              cb();
              return;
            }
            lastId = result.data.commentid[result.data.commentid.length - 1].id;
            cb();
          });
        });
      },
      () => callback()
    );
  }
  getTime(task, commentId, callback) {
    let page = 0,
      total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {},
      lastId = 0;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `https://coral.qq.com/article/${commentId}/comment?reqnum=20&commentid=${lastId}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('乐视评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('乐视评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (Number(result.errCode) !== 0) {
            total = -1;
            cb();
            return;
          }
          if (result.data.commentid.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data.commentid, () => {
            lastId = result.data.last;
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
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].time,
          support: comments[index].up,
          step: comments[index].poke,
          reply: comments[index].rep,
          c_user: {
            uid: comments[index].userinfo.userid,
            uname: comments[index].userinfo.nick,
            uavatar: comments[index].userinfo.head
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