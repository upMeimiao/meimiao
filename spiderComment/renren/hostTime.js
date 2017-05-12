/**
 * Created by dell on 2017/3/20.
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
    this.commentInfo(task, () => {
      callback();
    });
  }
  commentInfo(task, callback) {
    let page = 1,
      cycle = true;
    const total = this.core.settings.commentTotal % 10 === 0 ? this.core.settings.commentTotal / 10 : Math.ceil(this.core.settings.commentTotal / 10),
      option = {
        url: 'http://web.rr.tv/v3plus/comment/list',
        headers: {
          Referer: 'http://rr.tv/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
          clientType: 'web',
          clientVersion: '0.1.0'
        },
        data: {
          videoId: task.aid
        }
      };
    async.whilst(
      () => cycle,
      (cb) => {
        option.data.page = page;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.debug(option);
            logger.debug('人人视频评论列表接口请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('解析失败', result.body);
            cb();
            return;
          }
          if (result.data.results <= 0) {
            cycle = false;
            cb();
            return;
          }
          if (page >= total) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.data.results, () => {
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
      cid,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        cid = comments[index].id;
        comment = {
          cid,
          content: Utils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].createTime,
          support: comments[index].likeCount,
          c_user: {
            uid: comments[index].author.id,
            uname: comments[index].author.nickName,
            uavatar: comments[index].author.headImgUrl
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