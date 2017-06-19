/**
 * Created by zhupenghui on 2017/6/19.
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
    task.total = 0;
    this.getCommentList(task, () => {
      callback();
    });
  }
  getCommentList(task, callback) {
    const option = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    let cycle = true, index = 1;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://www.migudm.cn/ugc/${task.aid}/commentList_p${index}.html`;
        request.post(logger, option, (err, result) => {
          if (err) {
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            cb();
            return;
          }
          if (!result.data.comments || result.data.comments.length === 0) {
            cycle = false;
            cb();
            return;
          }
          if (!task.total) {
            task.total = result.data.totalCmt % 10 === 0 ?
              result.data.totalCmt / 10 : Math.ceil(result.data.totalCmt / 10);
          }
          this.deal(task, result.data.comments, () => {
            index += 1;
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
      comment;
    async.whilst(
      () => index < Math.min(task.total, this.settings.commentTotal),
      (cb) => {
        comment = {
          cid: comments[index].firstLevelCommentId,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          support: comments[index].praiseTotal,
          c_user: {
            uid: comments[index].hwUserId,
            uname: comments[index].nickName,
            uavatar: comments[index].userThumUrl
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