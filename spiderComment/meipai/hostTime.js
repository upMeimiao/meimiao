/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('neo-async');
const trimHtml = require('trim-html');

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
    async.parallel(
      {
        hot: (cb) => {
          this.getHot(task, () => cb());
        },
        time: (cb) => {
          this.getTime(task, () => cb());
        }
      },
      () => callback()
    );
  }
  getHot(task, callback) {
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
          if (result.hot_comments.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          if (task.hostTotal >= Number(this.settings.commentTotal)) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.hot_comments, () => {
            task.hostTotal += result.hot_comments.length;
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
  getTime(task, callback) {
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
          if (task.timeTotal >= Number(this.settings.commentTotal)) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result, () => {
            task.timeTotal += result.comments.length;
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
    async.whilst(
      () => index < length,
      (cb) => {
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
        spiderUtils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
        index += 1;
        cb();
      },
      () => callback()
    );
  }
}
module.exports = hostTime;