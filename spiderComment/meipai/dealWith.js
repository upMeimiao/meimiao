/**
* Created by junhao on 2017/2/08.
*/
const request = require('../../lib/request');
const async = require('neo-async');
const trimHtml = require('trim-html');
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
    task.cNum = 0; // 评论的数量
    task.lastId = 0; // 第一页评论的第一个评论Id
    task.lastTime = 0; // 第一页评论的第一个评论时间
    task.isEnd = false; // 判断当前评论跟库里返回的评论是否一致
    task.addCount = 0; // 新增的评论数
    this.commentList(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  commentList(task, callback) {
    const time = new Date().getTime(),
      option = {
        ua: 3,
        own_ua: 'Meipai/6.2.1 (iPhone; iOS 10.3.3; Scale/3.00)'
      };
    let maxId = '',
      cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.meipai + task.aid}&max_id=${maxId}&sigTime=${time}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            if (Number(err.status) === 400 && Number(err.message) === 400) {
              cycle = false;
              cb();
              return;
            }
            logger.error('美拍评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('美拍评论数据解析失败', result.body);
            cb();
            return;
          }
          if (result.comments.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          if (!task.lastId) {
            task.lastId = result.comments[0].id;
            task.lastTime = result.comments[0].created_at;
          }
          this.deal(task, result.comments, () => {
            if (task.isEnd) {
              callback();
              return;
            }
            maxId = result.comments[result.comments.length - 1].id;
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
    task.cNum += Number(length);
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId == comments[index].id ||
          task.commentTime >= comments[index].created_at) {
          task.isEnd = true;
          task.cNum = (parseInt(task.commentNum, 10) + (index === 0 ? index : index + 1)) +
            (task.cNum - length);
          callback();
          return;
        }
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(trimHtml(comments[index].content,
            { preserveTags: false, limit: comments[index].content.length + 1 }).html),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].created_at,
          support: comments[index].liked_count,
          step: '',
          c_user: {
            uid: comments[index].user.id,
            uname: comments[index].user.screen_name ?
              comments[index].user.screen_name : comments[index].user.screen_name_origin,
            uavatar: comments[index].user.avatar ? comments[index].user.avatar : ''
          }
        };
        // logger.debug(comment)
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
