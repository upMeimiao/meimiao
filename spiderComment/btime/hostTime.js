/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const moment = require('moment');
const cheerio = require('cheerio');

const jsonp = function (data) {
  return data;
};

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
    this.totalPage(task, () => {
      callback(null, 0, 0);
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
        this.totalPage(task, callback);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('btime评论数据解析失败');
        logger.info(result.body);
        this.totalPage(task, callback);
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
      if (task.cNum === 0) {
        const url = encodeURIComponent(`http://item.btime.com/${task.aid}`);
        this.getTotal(task, url, (error, data) => {
          if (error) {
            callback(error);
            return;
          }
          callback(null, data);
        });
      } else {
        let time = new Date(result.data.comments[0].pdate);
        time = moment(time).format('X');
        task.lastTime = time;
        task.lastId = result.data.comments[0].id;
        task.addCount = task.cNum - task.commentNum;
        task.url = null;
        this.commentList(task, () => {
          callback(null, '');
        });
      }
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
        this.getTotal(task, url, callback);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('btime评论数据解析失败');
        logger.info(result.body);
        this.totalPage(task, callback);
        return;
      }
      task.cNum = result.data.total;
      if ((task.cNum - task.commentNum) === 0 || result.data.comments.length <= 0) {
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
      this.commentList(task, () => {
        callback(null, '');
      });
    });
  }
  commentList(task, callback) {
    let page = 1;
    const total = Number(this.settings.commentTotal) % 5 === 0 ? Number(this.settings.commentTotal) / 5 : Math.ceil(Number(this.settings.commentTotal) / 5),
      option = {};
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
                if (result.data.comments.length <= 0) {
                  page += total;
                  cb();
                  return;
                }
                this.deal(task, result.data.comments, () => {
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
      time,
      data;
    async.whilst(
            () => index < length,
            (cb) => {
              time = new Date(comments[index].pdate);
              data = comments[index].user_info;
              time = moment(time).format('X');
              try {
                data = JSON.parse(data);
              } catch (e) {
                logger.debug('评论信息解析失败');
                logger.info(data);
                callback();
                return;
              }
              comment = {
                cid: comments[index].id,
                content: Utils.stringHandling(comments[index].message),
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
              Utils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
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