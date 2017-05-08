/**
 * Created by dell on 2017/3/9.
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
    const total = Number(this.settings.commentTotal) % 10 === 0 ?
        Number(this.settings.commentTotal) / 10 :
        Math.ceil(Number(this.settings.commentTotal) / 10);
    let page = 1,
      hotScore = -1,
      option,
      comments,
      length;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `http://m.uczzd.cn/iflow/api/v2/cmt/article/${task.aid}/comments/byhot?count=10&fr=iphone&dn=11341561814-acaf3ab1&hotValue=${hotScore}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('uc评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('uc评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.comments.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data, () => {
            comments = result.data.comments;
            length = comments.length;
            page += 1;
            hotScore = result.data.comments_map[comments[length - 1]].hotScore;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  getTime(task, callback) {
    const total = Number(this.settings.commentTotal) % 10 === 0 ?
        Number(this.settings.commentTotal) / 10 :
        Math.ceil(Number(this.settings.commentTotal) / 10);
    let page = 1,
      option,
      timeShow = -1,
      comments,
      length;
    async.whilst(
      () => page <= total,
      (cb) => {
        option = {
          url: `http://m.uczzd.cn/iflow/api/v2/cmt/article/${task.aid}/comments/bytime?app=uc-iflow&uc_param_str=frdnsnpfvecpntnwprdssskt&ts=${timeShow}&count=10&sn=1703-14172535094-2c254e96`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('uc评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('uc评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (result.data.comments.length <= 0) {
            page += total;
            cb();
            return;
          }
          this.deal(task, result.data, () => {
            comments = result.data.comments;
            length = comments.length;
            page += 1;
            timeShow = result.data.comments_map[comments[length - 1]].timeShow;
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
    const length = comments.comments.length;
    let index = 0,
      commentData,
      time,
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        commentData = comments.comments_map[comments.comments[index]];
        time = commentData.time.toString().substring(0, 10);
        comment = {
          cid: commentData.id,
          content: Utils.stringHandling(commentData.content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          support: commentData.up_cnt,
          reply: commentData.reply_cnt,
          c_user: {
            uid: commentData.ucid_sign,
            uname: commentData.user.nickname,
            uavatar: commentData.user.faceimg
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