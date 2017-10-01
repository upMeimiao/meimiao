/**
 * Created by zhupenghui on 2017/5/18.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('neo-async');

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
    task.total = 0;
    this.getTime(task, () => callback(null));
  }
  getTime(task, callback) {
    const option = {
        ua: 2
      },
      totalPage = this.settings.commentTotal % 20 === 0 ?
          this.settings.commentTotal / 20 :
          Math.ceil(this.settings.commentTotal / 20);
    let cycle = true, cursor = '', page = 1;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.meimiao}topic_id=${task.aid}&size=20&cursor=${cursor}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('评论列表解析失败', result.body);
            cb();
            return;
          }
          if (Number(result.code) !== 200 || !result.data.list.length) {
            task.lastId = task.commentId;
            task.lastTime = task.commentTime;
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.data.list, () => {
            if (task.isEnd || page >= totalPage) {
              cycle = false;
            }
            page += 1;
            cursor = result.data.cursor;
            cb();
          });
        });
      },
      () => callback()
    );
  }
  deal(task, comments, callback) {
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        time = comments[index].create_time;
        if (task.commentId == `${task.aid}_${comments[index].comment_id}` || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: `${task.aid}_${comments[index].comment_id}`,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: '',
          reply: '',
          c_user: {
            uid: comments[index].user.user_id,
            uname: comments[index].user.nickname,
            uavatar: comments[index].user.avatar
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
        // console.log(comment);
        index += 1;
        cb();
      },
      () => callback()
    );
  }
}
module.exports = hostTime;