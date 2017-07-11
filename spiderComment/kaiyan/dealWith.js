/**
* Created by zhupenghui on 2017/7/4.
*/
const async = require('neo-async');
const request = require('../../lib/request');
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
    this.getTotal(task, () => {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getTotal(task, callback) {
    const option = {
      url: `${this.settings.kaiyan.time + task.aid}&num=50&lastId=`,
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    let length = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        this.getTotal(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('列表解析失败', result.body);
        this.getTotal(task, callback);
        return;
      }
      if (!result.itemList || !result.itemList.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      task.cNum = result.total;
      if (Number(task.cNum) - Number(task.commentNum) <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (Number(task.cNum) - Number(task.commentNum) > 0) {
        length = Number(task.cNum) - Number(task.commentNum);
      }
      for (let i = 0; i < result.itemList.length; i += 1) {
        if (result.itemList[i].data.text && result.itemList[i].data.text === '最新评论') {
          task.lastId = result.itemList[i + 1].data.id;
          task.lastTime = parseInt(result.itemList[i + 1].data.createTime / 1000, 10);
          task.firstId = result.itemList[i + 1].data.sequence;
        }
      }
      task.addCount = length;
      this.commentList(task, () => {
        callback();
      });
    });
  }
  commentList(task, callback) {
    const option = {
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    let pageTotal = Number(task.addCount) % 50 === 0 ?
        Number(task.addCount / 50) : Math.ceil(Number(task.addCount / 50)),
      page = 1, lastId = '';
    async.whilst(
      () => page <= pageTotal,
      (cb) => {
        option.url = `${this.settings.kaiyan.time + task.aid}&num=50&lastId=${lastId}`;
        logger.debug(option.url);
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
          if (!result.itemList || !result.itemList.length) {
            pageTotal = -1;
            cb();
            return;
          }
          this.deal(task, result.itemList, () => {
            lastId = result.itemList[result.itemList.length - 1].data.sequence;
            page += 1;
            cb();
          });
        });
      },
      () => callback()
    );
  }
  deal(task, comments, callback) {
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        if (comments[index].data.text) {
          index += 1;
          cb();
          return;
        }
        time = parseInt(comments[index].data.createTime / 1000, 10);
        if (task.commentId == comments[index].data.id || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].data.id,
          content: spiderUtils.stringHandling(comments[index].data.message),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: comments[index].data.likeCount,
          reply: '',
          c_user: {
            uid: comments[index].data.user.uid,
            uname: comments[index].data.user.nickname,
            uavatar: comments[index].data.user.avatar
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
