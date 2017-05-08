/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const crypto = require('crypto');

const _Callback = function (data) {
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
    this.getTime(task, () => {
      callback();
    });
  }
  getTime(task, callback) {
    let page = 0, pos = 0,
      total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20);
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.qzone + task.bid}&tid=${task.aid}&pos=${pos}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('qzone评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = eval(result.body);
          } catch (e) {
            logger.debug('qzone评论数据解析失败', result.body);
            result = result.body.replace(/[\s\n\r]/g, '');
            result = result.match(/&pos=(\d*)/)[1];
            if (Number(result) < pos) {
              total = 0;
            }
            cb();
            return;
          }
          if (result.commentlist.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.commentlist, () => {
            page += 1;
            pos += 20;
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
      comment,
      md5,
      cid;
    async.whilst(
      () => index < length,
      (cb) => {
        md5 = crypto.createHash('md5');
        cid = md5.update(task.aid + comments[index].uin + comments[index].create_time).digest('hex');
        comment = {
          cid,
          content: Utils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].create_time,
          reply: comments[index].replyNum,
          c_user: {
            uid: comments[index].uin,
            uname: comments[index].name,
            uavatar: `http://qlogo3.store.qq.com/qzone/${comments[index].uin}/${comments[index].uin}/100`
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