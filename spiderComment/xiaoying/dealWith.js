/**
* Created by junhao on 2017/2/10.
*/
const async = require('async');
const req = require('request');
const moment = require('moment');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const _time = (time) => {
  time = time.split('');
  time[3] = `${time[3]}-`;
  time[5] = `${time[5]}-`;
  time[7] = `${time[7]} `;
  time[9] = `${time[9]}:`;
  time[11] = `${time[11]}:`;
  time = new Date(time.join(''));
  time = moment(time).format('X');
  return time;
};
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
    this.totalPage(task, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      if (result === 'add_0') {
        callback();
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getH(callback) {
    const options = { method: 'POST',
      url: 'http://viva.api.xiaoying.co/api/rest/d/dg',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'XiaoYing/5.3.5 (iPhone; iOS 10.1.1; Scale/3.00)'
      },
      form: {
        a: 'dg',
        b: '1.0',
        c: '20007700',
        e: 'DIqmr4fb',
        i: '{"a":"[I]a8675492c8816a22c28a1b97f890ae144a8a4fa3","b":"zh_CN"}',
        j: '6a0ea6a13e76e627121ee75c2b371ef2',
        k: 'xysdkios20130711'
      }
    };
    req(options, (error, response, body) => {
      if (error) {
        callback(error);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        callback(e);
        return;
      }
      const h = body.a;
      callback(null, h.a);
    });
  }
  totalPage(task, callback) {
    const option = {
      method: 'POST',
      url: this.settings.xiaoying,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'XiaoYing/5.5.6 (iPhone; iOS 10.2.1; Scale/3.00)'
      },
      form: {
        a: 'pa',
        b: '1.0',
        c: '20008400',
        e: 'DIqmr4fb',
        h: this.core.h,
        i: `{"d":20,"b":"1","c":1,"a":"${task.aid}"}`,
        j: 'ae788dbe17e25d0cff743af7c3225567',
        k: 'xysdkios20130711'
      }
    };
    let total = 0;
    req(option, (error, response, body) => {
      if (error) {
        logger.debug('小影评论总量请求失败', error);
        callback(error);
        return;
      }
      if (response.statusCode !== 200) {
        callback(response.statusCode);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('小影评论数据解析失败');
        logger.info(body);
        callback(e);
        return;
      }
      task.cNum = body.total;
      if ((task.cNum - task.commentNum) <= 0 || !body.comments.length) {
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
      task.lastTime = _time(body.comments[0].publishTime);
      task.lastId = body.comments[0].id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1;
    const option = {
      method: 'POST',
      url: this.settings.xiaoying,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'XiaoYing/5.5.6 (iPhone; iOS 10.2.1; Scale/3.00)'
      },
      form: {
        a: 'pa',
        b: '1.0',
        c: '20008400',
        e: 'DIqmr4fb',
        h: this.core.h,
        j: 'ae788dbe17e25d0cff743af7c3225567',
        k: 'xysdkios20130711'
      }
    };
    async.whilst(
      () => page <= total,
      (cb) => {
        option.form.i = `{"d":20,"b":"1","c":${page},"a":"${task.aid}"}`;
        req(option, (error, response, body) => {
          if (error) {
            logger.debug('小影评论列表请求失败', error);
            cb();
            return;
          }
          if (response.statusCode !== 200) {
            cb();
            return;
          }
          try {
            body = JSON.parse(body);
          } catch (e) {
            logger.debug('小影评论数据解析失败');
            logger.info(body);
            cb();
            return;
          }
          this.deal(task, body.comments, () => {
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
        time = _time(comments[index].publishTime);
        if (task.commentId == comments[index].id || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          support: comments[index].liked,
          step: comments[index].isLiked,
          c_user: {
            uid: comments[index].user.auid,
            uname: comments[index].user.nickName,
            uavatar: comments[index].user.profileImageUrl
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
