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
    this.getHot(task, (err) => {
      callback(null, task.hostTotal, task.timeTotal);
    });
  }
  getHot(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option.url = `${this.settings.baomihua + task.aid}&page=${page}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('爆米花评论列表请求失败', err);
                  return cb();
                }
                try {
                  result = JSON.parse(result.body.replace(/[\\]/g, '').replace(/[\s\r\n]/g, ''));
                } catch (e) {
                  logger.debug('爆米花评论数据解析失败');
                  logger.info(result);
                  return cb();
                }
                if (result.data.item.length <= 0) {
                  page += total;
                  return cb();
                }
                this.deal(task, result.result.item, (err) => {
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
              this.newTime = comments[index].createTime.toString();
              this.str1 = this.newTime.substr(0, 10).split('-');
              this.str1[1] = this.str1[1].length < 2 ? (this.str1[1] = `0${this.str1[1]}`) : this.str1[1];
              this.str2 = this.str1[2].length == 3 ? ` ${this.newTime.substr(9, this.newTime.length)}` : ` ${this.newTime.substr(10, this.newTime.length)}`;
              this.str1[2] = this.str1[2].length == 3 ? this.str1[2].slice(0, 2) : this.str1[2];
              this.str1 = this.str1.join('-');
              time = new Date(this.str1 + this.str2);
              time = moment(time).format('X');
              comment = {
                cid: comments[index].reviewID,
                content: Utils.stringHandling(comments[index].comment),
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
              task.hostTotal++;
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