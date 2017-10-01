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
    this.getTime(task, () => {
      callback();
    });
  }
  getTime(task, callback) {
    const option = {
      ua: 3,
      own_ua: 'Aipai/342 (iPhone; iOS 10.3.2; Scale/3.0) aipai/iOS/aipai/aipai/v(342)'
    };
    let pageTotal = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal / 20) :
        Math.ceil(Number(this.settings.commentTotal / 20)),
      page = 1;
    async.whilst(
      () => page <= pageTotal,
      (cb) => {
        option.url = `${this.settings.aipai + page}_spread-0_mobile-1_appver-i3.6.1_type-2_cid-${task.aid}.html`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('列表解析失败', result.body);
            cb();
            return;
          }
          this.deal(task, result.list, () => {
            if (task.isEnd) {
              pageTotal = -1;
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
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        time = comments[index].time;
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].comment),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: comments[index].likeNum,
          reply: '',
          c_user: {
            uid: comments[index].bid,
            uname: comments[index].nick,
            uavatar: comments[index].big
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