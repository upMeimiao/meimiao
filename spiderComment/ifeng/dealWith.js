/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request');
const async = require('async');
const Utils = require('../../lib/spiderUtils');

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
    this.getVid(task, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      if (result == 'add_0') {
        callback(null);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getVid(task, callback) {
    const option = {
      url: `http://v.ifeng.com/m/video_${task.aid}.shtml`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('Dom结构请求失败');
        callback(err);
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      let startIndex = result.indexOf('videoinfo={'),
        endIndex = result.indexOf(',"videoLargePoster"'),
        data = `{${result.substring(startIndex + 11, endIndex)}}`;
      const typeNum = null;
      if (endIndex !== 1) {
        endIndex = result.indexOf(';varcolumnName');
        data = result.substring(startIndex + 10, endIndex);
      }
      if (startIndex !== 1) {
        startIndex = result.indexOf('varvideoinfo=');
        endIndex = result.indexOf(';varcolumnName=');
        data = result.substring(startIndex + 13, endIndex).replace(/[\s\n\r]/g, '');
      }
      try {
        if (typeNum === 1) {
          data = data.replace(',"video', '}');
        }
        data = JSON.parse(data);
      } catch (e) {
        logger.debug('vid数据解析失败');
        logger.info(data);
        callback(e);
        return;
      }
      if (data.id && data.id.length > 10) {
        this.totalPage(task, data.id, (error, res) => {
          if (error) {
            callback(error);
            return;
          }
          callback(null, res);
        });
      } else {
        data.vid = data.videoid ? data.videoid : data.vid;
        this.totalPage(task, data.vid, (error, res) => {
          if (error) {
            callback(error);
            return;
          }
          callback(null, res);
        });
      }
    });
  }
  totalPage(task, vid, callback) {
    const option = {
      url: `${this.settings.ifeng}${vid}&p=1`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('凤凰评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('凤凰评论数据解析失败');
        logger.info(result.body);
        callback(e);
        return;
      }
      task.cNum = result.count;
      if ((task.cNum - task.commentNum) <= 0) {
        callback(null, 'add_0');
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 10) === 0 ? task.cNum / 10 : Math.ceil(task.cNum / 10);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 10) === 0 ? total / 10 : Math.ceil(total / 10);
      }

      task.lastTime = result.comments.newest[0].create_time;
      task.lastId = result.comments.newest[0].comment_id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, vid, () => {
        callback();
      });
    });
  }
  commentList(task, total, vid, callback) {
    let page = 1,
      option;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `${this.settings.ifeng}${vid}&p=${page}`
        };
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
          this.deal(task, result.comments, () => {
            if (task.isEnd) {
              total = -1;
              cb(null, 'add_0');
              return;
            }
            page += 1;
            cb();
          });
        });
      },
      (err, result) => {
        callback(null, result);
      }
    );
  }
  deal(task, comments, callback) {
    let length = comments.newest.length,
      index = 0,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId == comments.newest[index].comment_id || task.commentTime >= comments.newest[index].create_time) {
          task.isEnd = true;
          length = -1;
          cb();
          return;
        }
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
        Utils.commentCache(this.core.cache_db, comment);
				// Utils.saveCache(this.core.cache_db,'comment_cache',comment)
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
