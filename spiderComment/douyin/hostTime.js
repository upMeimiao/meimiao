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
    const pageTotal = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal / 20) :
        Math.ceil(Number(this.settings.commentTotal / 20)),
      option = {
        ua: 3,
        own_ua: 'Aweme/1.4.6 (iPhone; iOS 10.3.2; Scale/3.00)'
      };
    let page = 1,
      cursor = 0;
    async.whilst(
      () => page <= pageTotal,
      (cb) => {
        option.url = `${this.settings.douyin + task.aid}&cursor=${cursor}&app_name=aweme`;
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
          if (!result.comments || !result.comments.length) {
            cb('error');
            return;
          }
          this.deal(task, result.comments, () => {
            page += 1;
            cursor += 20;
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
        time = comments[index].create_time;
        comment = {
          cid: comments[index].cid,
          content: spiderUtils.stringHandling(comments[index].text),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: comments[index].digg_count,
          reply: comments[index].commentCount,
          c_user: {
            uid: comments[index].user.uid,
            uname: comments[index].user.nickname,
            uavatar: comments[index].user.avatar_medium.url_list[0]
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
        logger.info(comment);
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