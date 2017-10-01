/**
 * Created by zhupenghui on 2017/5/18.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('neo-async');
const zlib = require('zlib');

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
    this.getTime(task, () => {
      callback();
    });
  }
  getTime(task, callback) {
    const option = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    let cycle = true, info = '';
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.shanka}{"attach_info":"${info}","feed_id":"${task.aid}"}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('列表解析失败', result.body);
            cb();
            return;
          }
          if (!result.data || !result.data.comments || !result.data.comments.length) {
            cycle = false;
            cb();
            return;
          }
          if (!task.lastId) {
            task.lastId = result.data.comments[0].id;
            task.lastTime = result.data.comments[0].createtime;
          }
          this.deal(task, result.data.comments, () => {
            if (task.isEnd) {
              cycle = false;
            }
            info = result.data.attach_info;
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
      time,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        time = comments[index].createtime;
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: '',
          reply: '',
          c_user: {
            uid: comments[index].poster.id,
            uname: comments[index].poster.nick,
            uavatar: comments[index].poster.avatar
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_update_cache', wording);
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