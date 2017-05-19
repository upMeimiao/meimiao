/**
* Created by junhao on 2017/2/08.
*/
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

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
    this.getGroupId(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getGroupId(task, callback) {
    const option = {
      url: `http://www.365yg.com/item/${task.aid}/`
    };
    let groupId = '',
      startIndex = null,
      endIndex = null;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('单个视频请求失败');
        if (err.status && err.status === 404) {
          callback();
        } else {
          callback(err);
        }
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      startIndex = result.indexOf('player=');
      endIndex = result.indexOf(',nextSiblings');
      if (startIndex === -1 || endIndex === -1) {
        groupId = task.aid;
      } else {
        groupId = result.substring(startIndex + 7, endIndex + 5);
        groupId = groupId.replace(',next', '}').replace(/'/g, '"').replace(/:/g, '":').replace(/,/g, ',"')
          .replace('{', '{"')
          .replace('http"', 'http');
        groupId = JSON.parse(groupId).group_id;
      }
      if (!groupId) {
        task.group_id = task.aid;
      } else if (groupId == task.aid) {
        task.group_id = task.aid;
      } else {
        task.group_id = groupId;
      }
      this.commentList(task, () => {
        callback();
      });
    });
  }
  commentList(task, callback) {
    let offset = 0,
      cycle = true,
      option;
    async.whilst(
      () => cycle,
      (cb) => {
        option = {
          url: `${this.settings.toutiao}${task.group_id}&offset=${offset}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('今日头条评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('今日头条评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          if (!task.lastId) {
            task.lastId = result.data[0].comment.id;
            task.lastTime = result.data[0].comment.create_time;
          }
          this.deal(task, result.data, () => {
            if (task.isEnd) {
              callback();
              return;
            }
            offset += 50;
            cb();
          });
        });
      },
      () => {
        task.addCount = task.cNum - task.commentNum;
        callback();
      }
    );
  }
  deal(task, comments, callback) {
    const length = comments.length;
    let index = 0,
      comment;
    task.cNum += length;
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId == comments[index].comment.id || task.commentTime >= comments[index].comment.create_time) {
          task.isEnd = true;
          task.cNum = parseInt(task.commentNum, 10) + parseInt(index == 0 ? index : index + 1, 10);
          task.addCount = task.cNum - task.commentNum;
          callback();
          return;
        }
        comment = {
          cid: comments[index].comment.id,
          content: spiderUtils.stringHandling(comments[index].comment.text),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].comment.create_time,
          support: comments[index].comment.digg_count,
          step: '',
          reply: comments[index].comment.reply_count,
          c_user: {
            uid: comments[index].comment.user_id,
            uname: comments[index].comment.user_name,
            uavatar: comments[index].comment.user_profile_image_url
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
