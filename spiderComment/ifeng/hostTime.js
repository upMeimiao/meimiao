/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');

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
    this.getCid(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, 0, 0);
    });
  }
  getCid(task, callback) {
    const option = {
      url: `http://v.ifeng.com/docvlist/${task.aid}-1.js`,
      ua: 1
    };
    let cid;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论ID请求失败', err);
        return;
      }
      result = result.body;
      if (!result || result.length <= 0 || result.match(/404.shtml/)) {
        logger.debug('该视频已被删除', result.match(/404.shtml/)[0]);
        callback();
        return;
      }
      const startIndex = result.indexOf('var data='),
        endIndex = result.indexOf(';bsCallback.getSinglePage');
      if (startIndex === -1 || endIndex === -1) {
        logger.debug('没有评论', startIndex, '---', endIndex);
        callback();
        return;
      }
      let data = result.substring(startIndex + 9, endIndex);
      try {
        data = JSON.parse(data);
      } catch (e) {
        logger.debug('vid数据解析失败', data);
        callback(e);
        return;
      }
      this.getTime(task, data.dataList[0].guid, (error, res) => {
        if (error) {
          callback(error);
          return;
        }
        callback(null, res);
      });
    });
  }
  getTime(task, cid, callback) {
    let page = 1;
    const total = Number(this.settings.commentTotal) % 10 === 0 ?
        Number(this.settings.commentTotal) / 10 :
        Math.ceil(Number(this.settings.commentTotal) / 10),
      option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.ifeng}${cid}&p=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('凤凰评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('凤凰评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.comments.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.comments, () => {
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
    const length = comments.newest.length;
    let index = 0,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        comment = {
          cid: comments.newest[index].comment_id,
          content: Utils.stringHandling(comments.newest[index].comment_contents),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments.newest[index].create_time,
          c_user: {
            uid: comments.newest[index].user_id,
            uname: comments.newest[index].uname,
            uavatar: comments.newest[index].userFace
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