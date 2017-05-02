/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');

const _Callback = function (data) {
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
      callback();
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `${this.settings.souhu.topicId}http://my.tv.sohu.com/pl/${task.bid}/${task.aid}.shtml&topic_source_id=bk${task.aid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('bili评论总量请求失败', err);
        this.totalPage(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('bili评论数据解析失败');
        logger.info(result);
        this.totalPage(task, callback);
        return;
      }
      task.topicId = result.topic_id;
      this.getTime(task, () => {
        callback();
      });
    });
  }
  getTime(task, callback) {
    let page = 0,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.souhu.list}${task.topicId}&page_no=${page}&_${new Date().getTime()}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('搜狐评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('搜狐评论数据解析失败');
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
    const length = comments.length;
    let index = 0,
      comment;
    async.whilst(
            () => index < length,
            (cb) => {
              comment = {
                cid: comments[index].comment_id,
                content: Utils.stringHandling(comments[index].content),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: comments[index].create_time / 1000,
                support: comments[index].support_count,
                step: comments[index].floor_count,
                reply: comments[index].reply_count,
                c_user: {
                  uid: comments[index].passport.profile_url ? comments[index].passport.profile_url.match(/user\/(\d)*/)[1] : null,
                  uname: comments[index].passport.nickname,
                  uavatar: comments[index].passport.img_url
                }
              };
              if (!comment.c_user.uid) {
                delete comment.c_user.uid;
              }
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