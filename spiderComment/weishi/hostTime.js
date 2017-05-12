/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');

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
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option,
      pageflag = 0,
      pagetime = 0,
      lastid = 0;
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.weishi.list2}&id=${task.aid}&pageflag=${pageflag}&pagetime=${pagetime}&lastid=${lastid}&r=${new Date().getTime()}`,
                referer: 'http://wsi.qq.com',
                ua: 3,
                own_ua: 'Weishi/3.0.2 (iPhone; iPhone; iPhone OS 10.2.1; zh_CN)'
              };
                // logger.debug(option.url)
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('微视评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('微视评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                result.data.info = result.data.reco ? result.data.reco.info : result.data.info;
                if (!result.data.info) {
                  page += total;
                  return cb();
                }
                lastid = result.data.info[result.data.info.length - 1].id;
                pagetime = result.data.info[result.data.info.length - 1].timestamp;
                this.deal(task, result.data.info, (err) => {
                  if (task.isEnd) {
                    return callback();
                  }
                  pageflag = 2;
                  page++;
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
              comment = {
                cid: comments[index].id,
                content: Utils.stringHandling(comments[index].origtext),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].timestamp,
                c_user: {
                  uid: comments[index].uid,
                  uname: comments[index].name,
                  uavatar: `${comments[index].head}/74`
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