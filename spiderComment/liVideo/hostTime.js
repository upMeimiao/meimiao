/**
 * Created by dell on 2017/3/20.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const cheerio = require('cheerio');
const moment = require('moment');

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
          this.getHot(task, (err, result) => {
            cb(null, '热门评论数据完成');
          });
        },
        time: (cb) => {
          this.getIds(task, (err, result) => {
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
    let option = {
        url: `http://www.pearvideo.com/video_${task.aid}`
      },
      comments,
      $;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频详情页请求失败', err);
        return this.getHot(task, callback);
      }
      $ = cheerio.load(result.body);
      comments = $('.hot-comment .main-comm-list .hotcommentping');
      this.deal(task, comments, (err) => {
        callback();
      });
    });
  }
  getIds(task, callback) {
    const option = {
      url: `http://www.pearvideo.com/video_${task.aid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论列表Id获取失败', err);
        return this.getIds(task, callback);
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      let postId = result.match(/postId="\d*/).toString().replace('postId="', ''),
        postUserId = result.match(/postUserId="\d*/).toString().replace('postUserId="', '');
      if (postId && postUserId) {
        this.getTime(task, postId, postUserId, (err) => {
          callback();
        });
      } else {
        logger.debug('两个Id获取失败');
        return this.getIds(task, callback);
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
                url: `http://app.pearvideo.com/clt/page/v2/topic_comm_loading.jsp?parentId=${postId}&pageidx=2&score=${score}&postUserId=${postUserId}&mrd=${Math.random()}`
              };
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('梨视频评论列表请求失败', err);
                  return cb();
                }
                $ = cheerio.load(result.body);
                this.deal(task, $('.comm-li'), (err) => {
                  score = $('.comm-li').last().attr('data-score');
                  if (score == '' || score == undefined) {
                    cycle = false;
                    return cb();
                  }
                  cb();
                });
              });
            },
            (err, result) => {
              callback();
            }
        );
  }
  deal(task, comments, callback) {
    let length = comments.length,
      index = 0,
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
              index++;
              cb();
            },
            (err, result) => {
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