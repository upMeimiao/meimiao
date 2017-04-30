/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const moment = require('moment');

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
    this.totalPage(task, (err) => {
      callback(null, 0, 0);
    });
  }
  totalPage(task, callback) {
    let option = {
        url: `${this.settings.btime.list1}http%253A%252F%252Frecord.btime.com%252Fnews%253Fid%253D${task.aid}&page=1&_=${new Date().getTime()}`
      },
      total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('btime评论总量请求失败', err);
        return this.totalPage(task, callback);
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('btime评论数据解析失败');
        logger.info(result.body);
        return this.totalPage(task, callback);
      }
      task.cNum = result.data.total;
      if (task.commentNum <= 0) {
        total = (task.cNum % 5) == 0 ? task.cNum / 5 : Math.ceil(task.cNum / 5);
      } else if ((task.cNum - task.commentNum) === 0) {
        return callback(null, 'add_0');
      } else if ((task.cNum - task.commentNum) > 0) {
        total = (task.cNum - task.commentNum);
        total = (total % 5) == 0 ? total / 5 : Math.ceil(total / 5);
      }
      if (task.cNum == 0) {
        this.videoDom(task, (err, result) => {
          callback(null, result);
        });
      } else {
        let time = new Date(result.data.comments[0].pdate);
        time = moment(time).format('X');
        task.lastTime = time;
        task.lastId = result.data.comments[0].id;
        task.addCount = task.cNum - task.commentNum;
        task.url = null;
        this.commentList(task, (err) => {
          callback(null, '');
        });
      }
    });
  }
  videoDom(task, callback) {
    const option = {
      url: `http://item.btime.com/${task.aid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频DOM请求失败');
        return this.videoDom(task, callback);
      }
      let $ = cheerio.load(result.body),
        url = $('span.dianzan').attr('data-key').match(/2F\w*\.shtml/).toString().replace('2F', '');
      this.getTotal(task, url, (err, result) => {
        callback(null, result);
      });
    });
  }
  getTotal(task, url, callback) {
    task.url = url;
    let option = {
        url: `${this.settings.btime.list1}http%253A%252F%252Fnews.btime.com%252Fwemedia%252F20170217%252F${url}&page=1&_=${new Date().getTime()}`
      },
      total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('第二种视频总量请求失败');
        return this.getTotal(task, url, callback);
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('btime评论数据解析失败');
        logger.info(result.body);
        return this.totalPage(task, callback);
      }
      task.cNum = result.data.total;
      if (task.commentNum <= 0) {
        total = (task.cNum % 5) == 0 ? task.cNum / 5 : Math.ceil(task.cNum / 5);
      } else if ((task.cNum - task.commentNum) === 0) {
        return callback(null, 'add_0');
      } else if ((task.cNum - task.commentNum) > 0) {
        total = (task.cNum - task.commentNum);
        total = (total % 5) == 0 ? total / 5 : Math.ceil(total / 5);
      }
      let time = new Date(result.data.comments[0].pdate);
      time = moment(time).format('X');
      task.lastTime = time;
      task.lastId = result.data.comments[0].id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, (err) => {
        callback(null, '');
      });
    });
  }
  commentList(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 5 == 0 ? Number(this.settings.commentTotal) / 5 : Math.ceil(Number(this.settings.commentTotal) / 5),
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
                  return cb();
                }
                try {
                  result = eval(result.body);
                } catch (e) {
                  logger.debug('btime评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.data.comments.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.data.comments, (err) => {
                  page++;
                  cb();
                });
              });
            },
            (err, result) => {
              callback();
            }
        );
  }
  deal(task, comments, callback) {
    let length = comments.length,
      index = 0,
      comment,
      time;
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
                return callback();
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
              index++;
              cb();
            },
            (err, result) => {
              callback();
            }
        );
  }
}
module.exports = hostTime;