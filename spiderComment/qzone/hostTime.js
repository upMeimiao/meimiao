/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const md5 = require('js-md5');

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
    this.getTime(task, (err) => {
      callback();
    });
  }
  getTime(task, callback) {
    let page = 0,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {},
      pos = 0;
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.qzone + task.bid}&tid=${task.aid}&pos=${pos}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('qzone评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = eval(result.body);
                } catch (e) {
                  logger.debug('qzone评论数据解析失败');
                  logger.info(result.body);
                  return cb();
                }
                if (result.commentlist.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.commentlist, (err) => {
                  page++;
                  pos += 20;
                  cb();
                });
              });
            },
            (err, result) => {
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
              const cid = md5(task.aid + comments[index].uin + comments[index].create_time);
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
              index++;
              cb();
            },
            (err, result) => {
              callback();
            }
        );
  }
}
module.exports = hostTime;