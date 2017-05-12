/**
 * Created by dell on 2017/3/9.
 */
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const moment = require('moment');
const req = require('request');

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
    this.getTime(task, (err) => {
      callback();
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option;
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
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
                  i: `{"d":20,"b":"1","c":${page},"a":"${task.aid}"}`,
                  j: 'ae788dbe17e25d0cff743af7c3225567',
                  k: 'xysdkios20130711'
                }
              };
              req(option, (error, response, body) => {
                if (error) {
                  logger.debug('小影评论列表请求失败', err);
                  return cb();
                }
                try {
                  body = JSON.parse(body);
                } catch (e) {
                  logger.debug('小影评论数据解析失败');
                  logger.info(body);
                  return cb();
                }
                if (body.comments.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, body.comments, (err) => {
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
              time = this.time(comments[index].publishTime);
              comment = {
                cid: comments[index].id,
                content: Utils.stringHandling(comments[index].content),
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
              Utils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
              index++;
              cb();
            },
            (err, result) => {
              callback();
            }
        );
  }
  time(time) {
    time = time.split('');
    time[3] = `${time[3]}-`;
    time[5] = `${time[5]}-`;
    time[7] = `${time[7]} `;
    time[9] = `${time[9]}:`;
    time[11] = `${time[11]}:`;
    time = new Date(time.join(''));
    time = moment(time).format('X');
    return time;
  }
}
module.exports = hostTime;