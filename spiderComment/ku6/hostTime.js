/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const cheerio = require('cheerio');

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
    this.getTime(task, () => {
      callback();
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option = {};
    async.whilst(
            () => page <= total,
            (cb) => {
              option = {
                url: `${this.settings.ku6 + task.aid}&pn=${page}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('ku6评论列表请求失败', err);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('ku6评论数据解析失败');
                  logger.info(result);
                  cb();
                  return;
                }
                if (result.status == 300) {
                  total = -1;
                  cb();
                  return;
                }
                if (result.data.list.length <= 0) {
                  page += total;
                  cb();
                  return;
                }
                this.deal(task, result.data.list, () => {
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
    let length = comments.length,
      index = 0,
      comment;
    async.whilst(
            () => index < length,
            (cb) => {
              this.getAvatar(comments[index].commentAuthorId, (err, result) => {
                comment = {
                  cid: comments[index].id,
                  content: Utils.stringHandling(comments[index].commentContent),
                  platform: task.p,
                  bid: task.bid,
                  aid: task.aid,
                  ctime: comments[index].commentCtime.toString().substring(0, 10),
                  support: comments[index].commentCount,
                  c_user: {
                    uid: comments[index].commentAuthorId,
                    uname: comments[index].commentAuthor,
                    uavatar: result
                  }
                };
                Utils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
                index += 1;
                cb();
              });
            },
            () => {
              callback();
            }
        );
  }
  getAvatar(uid, callback) {
    const option = {
      url: `http://boke.ku6.com/${uid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('用户主页请求失败');
      }
      const $ = cheerio.load(result.body),
        avatar = $('a.headPhoto>img').attr('src');
      callback(null, avatar);
    });
  }
}
module.exports = hostTime;