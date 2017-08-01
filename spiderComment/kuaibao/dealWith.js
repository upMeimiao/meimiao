/**
* Created by junhao on 2017/2/08.
*/
const request = require('../../lib/request');
const async = require('neo-async');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.cNum = 0;      // 评论的数量
    task.lastId = 0;      // 第一页评论的第一个评论Id
    task.lastTime = 0;      // 第一页评论的第一个评论时间
    task.isEnd = false;  // 判断当前评论跟库里返回的评论是否一致
    task.addCount = 0;      // 新增的评论数
    this.commentTotal(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  commentTotal(task, callback) {
    const option = {
      url: this.settings.kuaibao.commentList,
      headers: {
        apptype: 'ios',
        'device-model': 'iPhone8,2',
        connection: 'keep-alive',
        apptypeext: 'qnreading',
        appversion: '2.8.0',
        referer: 'http://r.cnews.qq.com/inews/iphone/',
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': '%e5%a4%a9%e5%a4%a9%e5%bf%ab%e6%8a%a5 2.8.0 qnreading (iPhone; iOS 10.3.3; zh_CN; 2.8.0.11)'
      },
      data: {
        chlid: 'daily_timeline',
        c_type: 'comment',
        article_id: task.aid,
        byaid: 1,
        page: 1
      }
    };
    let total;
    // console.log(option);
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('评论总数请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('解析失败', result.body);
        callback(e);
        return;
      }
      if (Number(result.ret) !== 0) {
        callback();
        return;
      }
      task.cNum = result.comments.count;
      if ((task.cNum - task.commentNum) <= 0 || !result.comments.new || !result.comments.new.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) === 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) === 0 ? total / 20 : Math.ceil(total / 20);
      }
      result = result.comments.new[0];
      task.lastTime = result[result.length - 1].pub_time;
      task.lastId = result[result.length - 1].reply_id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    const option = {
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
        if (task.commentId == comment.reply_id || task.commentTime >= comment.pub_time) {
          task.isEnd = true;
          callback();
          return;
        }
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
        spiderUtils.saveCache(this.core.cache_db, 'comment_cache', comment);
        index += 1;
        cb();
      },
      () => {
        callback();
      }
    );
  }
}
module.exports = dealWith;
