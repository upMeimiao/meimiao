/**
 * Created by dell on 2017/3/9.
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
    this.getTime(task, () => callback());
  }
  getTime(task, callback) {
    const total = Number(this.settings.commentTotal) % 20 === 0 ?
      Number(this.settings.commentTotal) / 20 :
      Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {
        url: this.settings.kuaibao.commentList,
        headers: {
          'User-Agent': '%e5%a4%a9%e5%a4%a9%e5%bf%ab%e6%8a%a5 2.8.0 qnreading (iPhone; iOS 10.3.3; zh_CN; 2.8.0.11)',
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: 'http://r.cnews.qq.com/inews/iphone/',
          appversion: '0',
          apptypeExt: 'qnreading',
          Connection: 'keep-alive',
          'device-model': 'iPhone8,2',
          apptype: 'ios'
        },
        data: {
          chlid: 'daily_timeline',
          c_type: 'comment',
          article_id: task.aid,
          byaid: 1,
          page: 1
        }
      };
    let page = 1;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.data.page = page;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.debug('天天快报评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('天天快报评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (Number(result.ret) !== 0 || !result.comments.new || !result.comments.new.length) {
            page += total + 1;
            cb();
            return;
          }
          this.deal(task, result.comments.new, () => {
            if (task.isEnd) {
              callback();
              return;
            }
            page += 1;
            cb();
          });
        });
      },
      () => callback()
    );
  }
  deal(task, comments, callback) {
    const length = comments.length;
    let index = 0,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        comment = comments[index].pop();
        comment = {
          cid: comment.reply_id,
          content: spiderUtils.stringHandling(comment.reply_content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comment.pub_time,
          support: comment.agree_count,
          c_user: {
            uid: comment.coral_uid,
            uname: comment.nick,
            uavatar: comment.head_url
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