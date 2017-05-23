/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('async');
const crypto = require('crypto');

const sign = (e) => {
  const md5 = crypto.createHash('md5');
  return md5.update(`700-cJpvjG4g&bad4543751cacf3322ab683576474e31&${e}`).digest('hex');
};
let logger;
class hostTime {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = spiderCore.settings.logger;
  }
  todo(task, callback) {
    task.timeTotal = 0;
    this.commentList(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback();
    });
  }
  commentList(task, callback) {
    const option = {};
    let page = 1,
      time,
      total = this.settings.commentTotal % 30 === 0 ?
        this.settings.commentTotal / 30 : Math.ceil(this.settings.commentTotal / 30);
    async.whilst(
      () => page <= Math.min(total),
      (cb) => {
        time = new Date().getTime().toString().substring(0, 10);
        option.url = `${this.settings.tudou.commentId}${task.aid}&objectType=1&listType=0&currentPage=${page}&pageSize=30&sign=${sign(time)}&time=${time}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('土豆评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('土豆评论列表数据解析失败', result.body);
            cb();
            return;
          }
          result = result.data.comment;
          this.deal(task, result, () => {
            if (task.isEnd) {
              total = 0;
              cb();
              return;
            }
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
    let length = comments.length,
      index = 0,
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
          ctime: parseInt(comments[index].createTime / 1000, 10),
          support: comments[index].upCount,
          step: comments[index].downCount,
          reply: comments[index].replyCount,
          c_user: {
            uid: comments[index].user.userId,
            uname: comments[index].user.userName,
            uavatar: comments[index].user.avatarMiddle
          }
        };
        task.timeTotal += 1;
        if (task.timeTotal >= this.settings.commentTotal) {
          task.isEnd = true;
          length = 0;
          cb();
          return;
        }
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