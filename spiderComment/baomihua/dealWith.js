/**
* Created by junhao on 2017/2/10.
*/
const async = require('async');
const moment = require('moment');
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
    this.totalPage(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `${this.settings.baomihua + task.aid}&page=1`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('爆米花评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body.replace(/[\\]/g, '').replace(/[\s\r\n\b]/g, ''));
      } catch (e) {
        logger.debug('爆米花评论数据解析失败', result.body);
        callback(e);
        return;
      }
      if (result.result.errcode == -1) {
        callback();
        return;
      }
      task.cNum = result.result.action.reviewCount;
      if ((task.cNum - task.commentNum) <= 0 || result.result.item.length <= 0) {
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
      const time = new Date(result.result.item[0].createTime);
      task.lastTime = moment(time).format('X');
      task.lastId = result.result.item[0].reviewID;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1;
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.baomihua + task.aid}&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('爆米花评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body.replace(/[\\]/g, '').replace(/[\s\r\n\b]/g, ''));
          } catch (e) {
            logger.debug('爆米花评论数据解析失败', result.body);
            cb();
            return;
          }
          this.deal(task, result.result.item, () => {
            if (task.isEnd) {
              callback();
              return;
            }
            page += 1;
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
      time;
    async.whilst(
      () => index < length,
      (cb) => {
        this.newTime = comments[index].createTime.toString();
        this.str1 = this.newTime.substr(0, 10).split('-');
        this.str1[1] = this.str1[1].length < 2 ? (this.str1[1] = `0${this.str1[1]}`) : this.str1[1];
        this.str2 = this.str1[2].length === 3 ? ` ${this.newTime.substr(9, this.newTime.length)}` : ` ${this.newTime.substr(10, this.newTime.length)}`;
        this.str1[2] = this.str1[2].length === 3 ? this.str1[2].slice(0, 2) : this.str1[2];
        this.str1 = this.str1.join('-');
        time = new Date(this.str1 + this.str2);
        time = moment(time).format('X');
        if (task.commentId == comments[index].reviewID || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].reviewID,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          support: comments[index].zannum,
          c_user: {
            uid: comments[index].user.userID,
            uname: comments[index].user.nickName,
            uavatar: comments[index].user.userImgURL
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
