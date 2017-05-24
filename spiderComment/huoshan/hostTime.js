/**
 * Created by zhupenghui on 2017/5/24.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
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
    task.total = 0;
    async.parallel(
      {
        hot: (cb) => {
          this.getHot(task, () => {
            cb(null, '热门评论数据完成');
          });
        },
        time: (cb) => {
          this.getTime(task, () => {
            cb(null, '最新评论数据完成');
          });
        }
      },
      (err, result) => {
        logger.debug('result: ', result);
        callback();
      }
    );
  }
  getHot(task, callback) {
    const option = {
      url: `https://api.huoshan.com/hotsoon/item/${task.aid}/comments/?aid=1112&os_version=10.3.1&app_name=live_stream&device_type=iPhone8,2&version_code=2.1.0&count=30&offset=0`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        this.getHot(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论列表解析失败', result.body);
        this.getHot(task, callback);
        return;
      }
      if (!result.data.hot_comments.length) {
        callback();
        return;
      }
      this.deal(task, result.data.hot_comments, () => {
        callback();
      });
    });
  }
  getTime(task, callback) {
    const option = {
      ua: 2
    };
    let cycle = true,
      offset = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `https://api.huoshan.com/hotsoon/item/${task.aid}/comments/?&os_version=10.3.1&app_name=live_stream&device_type=iPhone8,2&version_code=2.1.0&count=20&offset=${offset}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('评论列表请求错误', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('评论列表解析失败', result.body);
            cb();
            return;
          }
          if (!result.data.comments.length) {
            cycle = false;
            cb();
            return;
          }
          if (offset >= this.settings.commentTotal) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.data.comments, () => {
            if (task.isEnd) {
              cycle = false;
            }
            offset += 20;
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
    let index = 0,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].text),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].create_time,
          step: '',
          support: comments[index].digg_count,
          reply: '',
          c_user: {
            uid: comments[index].user.id,
            uname: comments[index].user.nickname,
            uavatar: comments[index].user.avatar_large.uri
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