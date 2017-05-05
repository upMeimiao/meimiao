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
    this.getVid(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, 0, 0);
    });
  }
  getVid(task, callback) {
    const option = {
      url: `http://v.ifeng.com/m/video_${task.aid}.shtml`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('Dom结构请求失败');
        this.getVid(task, callback);
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      let startIndex = result.indexOf('videoinfo={'),
        endIndex = result.indexOf(',"videoLargePoster"'),
        data = `{${result.substring(startIndex + 11, endIndex)}}`,
        typeNum = null;
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
        this.getVid(task, callback);
        return;
      }
      if (data.id && data.id.length > 10) {
        this.getTime(task, data.id, (error, res) => {
          callback(null, res);
        });
      } else {
        data.vid = data.videoid ? data.videoid : data.vid;
        this.getTime(task, data.vid, (error, res) => {
          callback(null, res);
        });
      }
    });
  }
  getTime(task, vid, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 10 == 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
      option = {};
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
    let length = comments.newest.length,
      index = 0,
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