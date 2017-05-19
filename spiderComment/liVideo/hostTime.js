/**
 * Created by dell on 2017/3/20.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const cheerio = require('cheerio');
const moment = require('moment');

const _cookie = (arr) => {
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
          this.getHot(task, () => {
            cb(null, '热门评论数据完成');
          });
        },
        time: (cb) => {
          this.getIds(task, () => {
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
      url: `http://www.pearvideo.com/video_${task.aid}`
    };
    let comments,
      $;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频详情页请求失败', err);
        this.getHot(task, callback);
        return;
      }
      $ = cheerio.load(result.body);
      comments = $('.hot-comment .main-comm-list .hotcommentping');
      this.deal(task, comments, () => {
        callback();
      });
    });
  }
  getIds(task, callback) {
    const option = {
      url: `http://app.pearvideo.com/clt/jsp/v2/content.jsp?contId=${task.aid}`,
      ua: 3,
      own_ua: 'LiVideoIOS/2.2.1 (iPhone; iOS 10.3.1; Scale/3.00)',
      headers: {
        Cookie: `PEAR_UUID=${_cookie([8, 4, 4, 4, 12])}`
      }
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论列表Id获取失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
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
        this.getTime(task, postId, postUserId, () => {
          callback();
        });
      } else {
        logger.debug('postId获取失败');
        callback('error');
      }
    });
  }
  getTime(task, postId, postUserId, callback) {
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
          this.deal(task, $('.comm-li'), () => {
            score = $('.comm-li').last().attr('data-score');
            if (score == '' || score == undefined) {
              cycle = false;
              cb();
              return;
            }
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
      commentData,
      time,
      comment,
      avatar;
    async.whilst(
            () => index < length,
            (cb) => {
              commentData = comments.eq(index);
              avatar = commentData.find('.comm-hdimg').attr('style').replace('background-image: url(', '').replace(');', '');
              time = this.time(commentData.find('.date').text());
              comment = {
                cid: commentData.attr('id'),
                content: Utils.stringHandling(commentData.find('.comm-cont').text()),
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
              Utils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
              index += 1;
              cb();
            },
            () => {
              callback();
            }
        );
  }
  time(time) {
    let time1 = null,
      time2 = null;
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
    time2 = `${time.split(' ')[1]}:00`;
    if (time1.length < 3) {
      time1 = `${new Date().getFullYear()}-${time1.join('-')} `;
    }
    time = new Date(time1 + time2);
    return moment(time).format('X');
  }
}
module.exports = hostTime;