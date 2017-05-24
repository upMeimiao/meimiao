/**
* Created by junhao on 2017/2/10.
*/
const async = require('async');
const crypto = require('crypto');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const _Callback = function (data) {
  return data;
};

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
    this.total(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  total(task, callback) {
    const option = {
      url: `${this.settings.qzone + task.bid}&tid=${task.aid}&pos=0`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('qzone的评论总数请求失败');
        callback(err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('qzone数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      task.cNum = result.cmtnum;
      if ((task.cNum - task.commentNum) <= 0 || !result.commentlist || result.commentlist.length <= 0) {
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
      const comment = result.commentlist[0];
      const md5 = crypto.createHash('md5');
      task.lastTime = comment.create_time;
      task.lastId = md5.update(task.aid + comment.uin + comment.create_time).digest('hex');
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 0,
      pos = 0,
      option;
    async.whilst(
      () => page < total,
      (cb) => {
        option = {
          url: `${this.settings.qzone + task.bid}&tid=${task.aid}&pos=${pos}`
        };
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
          if (!result.commentlist) {
            total = 0;
            cb();
            return;
          }
          this.deal(task, result.commentlist, () => {
            if (task.isEnd) {
              total = -1;
              cb();
              return;
            }
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
    let length = comments.length,
      index = 0, md5,
      cid,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        md5 = crypto.createHash('md5');
        cid = md5.update(task.aid + comments[index].uin + comments[index].create_time).digest('hex');
        if (task.commentId == cid || task.commentTime >= comments[index].create_time) {
          task.isEnd = true;
          length = 0;
          cb();
          return;
        }
        comment = {
          cid,
          content: spiderUtils.stringHandling(comments[index].content),
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
