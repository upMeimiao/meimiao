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
      own_ua: 'Toffee/2.3.0 (iPhone; iOS 10.3.2; Scale/3.00)'
    };
    let pageTotal = this.settings.commentTotal % 12 === 0 ?
       this.settings.commentTotal / 12 : Math.ceil(this.settings.commentTotal / 12),
      start = 0, page = 1;
    async.whilst(
      () => page <= pageTotal,
      (cb) => {
        option.url = `${this.settings.naitang + task.aid}&start=${start}`;
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
          if (!result.data || !result.data.list.length) {
            pageTotal = -1;
            cb();
            return;
          }
          this.deal(task, result.data.list, () => {
            if (task.isEnd) {
              pageTotal = -1;
            }
            page += 1;
            start += 12;
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
        time = comments[index].createline;
        comment = {
          cid: comments[index].msgid,
          content: spiderUtils.stringHandling(comments[index].title),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: '',
          reply: '',
          c_user: {
            uid: comments[index].userid,
            uname: comments[index].nickname,
            uavatar: comments[index].img
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