/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('neo-async');
const moment = require('moment');

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
    this.getTime(task, () => {
      callback();
    });
  }
  getTime(task, callback) {
    let length = 0, lastId = 0, cycle = true;
    const option = {
      url: this.settings.v1,
      headers: {
        'User-Agent': 'V1_vodone/6.1.2 (iPhone; iOS 10.3.2; Scale/3.00)',
        'Content-Type': 'multipart/form-data; boundary=Boundary+44C47EA48862ADB4'
      },
      data: {
        type: 1,
        vid: task.aid
      }
    };
    async.whilst(
      () => cycle,
      (cb) => {
        option.data.last_id = lastId;
        // logger.debug(option.url);
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.debug('v1评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('v1评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (!result.body || !result.body.data || !result.body.data.length) {
            cycle = false;
            cb();
            return;
          }
          length = result.body.data.length;
          task.timeTotal += length;
          this.deal(task, result.body.data, () => {
            if (task.timeTotal >= this.settings.commentTotal) {
              cycle = false;
            }
            lastId = result.body.data[length - 1].comment_id;
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
      time,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        time = new Date(comments[index].createTime);
        time = moment(time).format('X');
        comment = {
          cid: comments[index].comment_id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          c_user: {
            uid: comments[index].userid || '',
            uname: comments[index].nickname || '',
            uavatar: comments[index].picture || ''
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