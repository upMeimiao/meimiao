/**
* Created by junhao on 2017/2/10.
*/
const async = require('async');
const cheerio = require('cheerio');
const moment = require('moment');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const _time = (time) => {
  let time1;
  if (!time) {
    logger.debug('评论时间不存在');
    return '';
  }
  if (time.includes('刚刚')) {
    return moment().unix();
  }
  if (time.includes('分钟')) {
    time = time.replace('分钟前', '');
    time = Number(moment().unix()) - (Number(time) * 60);
    return time;
  }
  time1 = time.split(' ')[0].split('-');
  const time2 = `${time.split(' ')[1]}:00`;
  if (time1.length < 3) {
    time1 = `${new Date().getFullYear()}-${time1.join('-')} `;
  }
  time = new Date(time1 + time2);
  return moment(time).format('X');
};
const _cookie = (arr) => {
  /* 随机生成一个cookie信息 */
  const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let cookie = '';
  for (const num of arr) {
    cookie += '-';
    for (let i = 0; i < num; i += 1) {
      const random = Math.floor(Math.random() * str.length);
      cookie += str[random];
    }
  }
  return cookie.replace('-', '');
};

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
    this.getIds(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getIds(task, callback) {
    const option = {
      url: `http://app.pearvideo.com/clt/jsp/v2/content.jsp?contId=${task.aid}`,
      ua: 3,
      own_ua: 'LiVideoIOS/2.2.1 (iPhone; iOS 10.3.1; Scale/3.00)',
      Cookie: `PEAR_UUID=${_cookie([8, 4, 4, 4, 12])}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论列表Id获取失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body.replace(/[\n\r]/, ''));
      } catch (e) {
        logger.debug('视频信息解析失败', result.body);
        callback(e);
        return;
      }
      if (result.resultCode == 5 || result.resultMsg == '该文章已经下线！' || !result.postInfo) {
        callback();
        return;
      }
      const postId = result.postInfo.postId,
        postUserId = result.content.authors != '' ? result.content.authors[0].userId : '';
      if (postId) {
        this.commentList(task, postId, postUserId, () => {
          callback();
        });
      } else {
        logger.debug('postId获取失败');
        callback('error');
      }
    });
  }
  commentList(task, postId, postUserId, callback) {
    let score = 0,
      option = {},
      cycle = true,
      $ = null;
    async.whilst(
      () => cycle,
      (cb) => {
        option = {
          url: `http://app.pearvideo.com/clt/page/v2/topic_comm_loading.jsp?parentId=${postId}&pageidx=2&score=${score}&postUserId=${postUserId}&mrd=${Math.random()}`,
          ua: 2,
          Referer: `http://app.pearvideo.com/clt/page/v2/topic_comm.jsp?postId=${postId}&contId=${task.aid}`,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('梨视频评论列表请求失败', err);
            cb();
            return;
          }
          if (!result.body || result.body == '') {
            cycle = false;
            cb();
            return;
          }
          $ = cheerio.load(result.body);
          if (!task.lastId) {
            task.lastId = $('.comm-li').first().attr('id');
            task.lastTime = $('.comm-li').first().attr('id');
            task.lastTime = _time($('.comm-li').first().find('.date').text());
          }
          this.deal(task, $('.comm-li'), () => {
            score = $('.comm-li').last().attr('data-score');
            if (score === '' || score === undefined) {
              cycle = false;
              cb();
              return;
            }
            if (task.isEnd) {
              cycle = false;
            }
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
      commentData,
      time,
      avatar,
      comment;
    task.cNum += length;
    async.whilst(
      () => index < length,
      (cb) => {
        commentData = comments.eq(index);
        time = _time(commentData.find('.date').text());
        if (task.commentId == commentData.attr('id') || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: commentData.attr('id'),
          content: spiderUtils.stringHandling(commentData.find('.comm-cont').text()),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: commentData.find('.cai').text(),
          support: commentData.find('.zan').text(),
          reply: commentData.find('.ping').text(),
          c_user: {
            uname: commentData.find('.comm-name').text(),
            uavatar: avatar
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
