/**
 * Created by dell on 2017/3/9.
 */
const async = require('async');
const cheerio = require('cheerio');
const URL = require('url');
const crypto = require('crypto');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

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
      $,
      comments,
      total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20);
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.miaopai}${task.aid}&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('秒拍评论列表请求失败', err);
            if (err.status >= 500) {
              page += 1;
            }
            cb();
            return;
          }
          if (!result.body || result.body == '') {
            total = -1;
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('秒拍评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          $ = cheerio.load(result.html);
          comments = $('div.vid_hid');
          if (comments.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, comments, () => {
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
      comment,
      url,
      uid,
      content,
      cid,
      md5;
    async.whilst(
      () => index < length,
      (cb) => {
        md5 = crypto.createHash('md5');
        url = comments.eq(index).find('div.hid_con>a').attr('data-link');
        uid = URL.parse(url, true).query.suid;
        content = comments.eq(index).find('p.hid_con_txt2').text();
        cid = md5.update(uid + content).digest('hex');
        comment = {
          cid,
          content: spiderUtils.stringHandling(content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: '',
          support: '',
          step: '',
          c_user: {
            uid,
            uname: comments.eq(index).find('p.hid_con_txt1>b>a').text(),
            uavatar: comments.eq(index).find('div.hid_con>a').attr('data-url')
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