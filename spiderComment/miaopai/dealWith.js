/**
* Created by junhao on 2017/2/08.
*/
const request = require('../../lib/request');
const async = require('async');
const spiderUtils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');
const URL = require('url');
const md5 = require('js-md5');

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
    this.totalPage(task, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      if (result === 'add_0') {
        callback(null);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `${this.settings.miaopai}${task.aid}&page=1`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('秒拍评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('秒拍评论数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      task.cNum = result.total;
      if ((task.cNum - task.commentNum) <= 0) {
        callback(null, 'add_0');
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) === 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) === 0 ? total / 20 : Math.ceil(total / 20);
      }
      const $ = cheerio.load(result.html),
        comment = $('div.vid_hid'),
        url = comment.eq(0).find('div.hid_con>a').attr('data-link'),
        uid = URL.parse(url, true).query.suid,
        content = comment.eq(0).find('p.hid_con_txt2').html(),
        cid = md5(uid + content);
      task.lastId = cid;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1,
      option,
      $,
      comments;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `${this.settings.miaopai}${task.aid}&page=${page}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('秒拍评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = result.body.toString();
            result = JSON.parse(result);
          } catch (e) {
            logger.debug('秒拍评论数据解析失败');
            logger.info('---', result.body);
            cb();
            return;
          }
          $ = cheerio.load(result.html.replace(/[\n\r]/g, ''));
          comments = $('div.vid_hid');
          this.deal(task, comments, () => {
            if (task.isEnd) {
              callback();
              return;
            }
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
      cid;
    async.whilst(
      () => index < length,
      (cb) => {
        url = comments.eq(index).find('div.hid_con>a').attr('data-link');
        uid = URL.parse(url, true).query.suid;
        content = comments.eq(index).find('p.hid_con_txt2').text();
        cid = md5(uid + content);
        if (task.commentId == cid) {
          callback();
          task.isEnd = true;
          return;
        }
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
