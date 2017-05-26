/**
 * Created by junhao on 2017/2/10.
 */
const async = require('async');
const cheerio = require('cheerio');
const moment = require('moment');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const jsonp = function (data) {
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
      url: `${this.settings.btime.list1}http%253A%252F%252Frecord.btime.com%252Fnews%253Fid%253D${task.aid}&page=1&_=${new Date().getTime()}`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('btime评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('btime评论数据解析失败');
        logger.info(result.body);
        callback(err);
        return;
      }
      task.cNum = result.data.total;
      if ((task.cNum - task.commentNum) === 0) {
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 5) === 0 ? task.cNum / 5 : Math.ceil(task.cNum / 5);
      } else if ((task.cNum - task.commentNum) > 0) {
        total = (task.cNum - task.commentNum);
        total = (total % 5) === 0 ? total / 5 : Math.ceil(total / 5);
      }
      if (task.cNum == 0) {
        const url = encodeURIComponent(`http://item.btime.com/${task.aid}`);
        this.getTotal(task, url, (error, data) => {
          if (error) {
            callback(error);
            return;
          }
          callback(null, data);
        });
        return;
      }
      if (!result.data.comments.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      let time = new Date(result.data.comments[0].pdate);
      time = moment(time).format('X');
      task.lastTime = time;
      task.lastId = result.data.comments[0].id;
      task.addCount = task.cNum - task.commentNum;
      task.url = null;
      this.commentList(task, total, () => {
        callback(null, '');
      });
    });
  }
  getTotal(task, url, callback) {
    task.url = url;
    const option = {
      url: `${this.settings.btime.list1}http%253A%252F%252Fnews.btime.com%252Fwemedia%252F20170217%252F${url}&page=1&_=${new Date().getTime()}`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('第二种视频总量请求失败');
        callback(err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('btime评论数据解析失败');
        logger.info(result.body);
        callback(e);
        return;
      }
      task.cNum = result.data.total;
      if ((task.cNum - task.commentNum) === 0 || result.data.comments.length <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 5) === 0 ? task.cNum / 5 : Math.ceil(task.cNum / 5);
      } else if ((task.cNum - task.commentNum) > 0) {
        total = (task.cNum - task.commentNum);
        total = (total % 5) === 0 ? total / 5 : Math.ceil(total / 5);
      }
      let time = new Date(result.data.comments[0].pdate);
      time = moment(time).format('X');
      task.lastTime = time;
      task.lastId = result.data.comments[0].id;
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
        if (task.url) {
          option.url = `${this.settings.btime.list1}http%253A%252F%252Fnews.btime.com%252Fwemedia%252F20170217%252F${task.url}&page=${page}&_=${new Date().getTime()}`;
        } else {
          option.url = `${this.settings.btime.list1}http%253A%252F%252Frecord.btime.com%252Fnews%253Fid%253D${task.aid}&page=${page}&_=${new Date().getTime()}`;
        }
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('btime评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = eval(result.body);
          } catch (e) {
            logger.debug('btime评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.data.comments, () => {
            if (task.isEnd) {
              total = -1;
              cb();
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
    let length = comments.length,
      index = 0,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        let time = new Date(comments[index].pdate),
          data = comments[index].user_info;
        time = moment(time).format('X');
        try {
          data = JSON.parse(data);
        } catch (e) {
          logger.debug('评论信息解析失败');
          logger.info(data);
          cb();
          return;
        }
        if (task.commentId == comments[index].id || task.commentTime >= time) {
          task.isEnd = true;
          length = 0;
          cb();
          return;
        }
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].message),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          support: comments[index].likes,
          c_user: {
            uid: comments[index].uid,
            uname: data.user_name,
            uavatar: data.img_url
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
