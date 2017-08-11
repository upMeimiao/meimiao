/**
 * Created by junhao on 2017/2/08.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const vm = require('vm');

const sandbox = {
  jsonp: data => data
};
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
    this.albumid(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  albumid(task, callback) {
    const option = {
      url: `http://mixer.video.iqiyi.com/jp/mixin/videos/${task.aid}?callback=jsonp&status=1`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('视频详情请求失败', err.message);
        callback(err);
        return;
      }
      result = vm.runInNewContext(result.body, sandbox);
      task.albumid = result.data.albumId;
      this.totalPage(task, (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback();
      });
    });
  }
  totalPage(task, callback) {
    const option = {
      url: `${this.settings.iqiyi.list}${task.albumid}&tvid=${task.aid}&page=1`
    };
    let total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('爱奇艺评论总量请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('爱奇艺评论数据解析失败');
        logger.info(result);
        callback(err);
        return;
      }
      task.cNum = result.data.count;
      if ((task.cNum - task.commentNum) <= 0 || result.data.comments.length <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) === 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) === 0 ? total / 20 : Math.ceil(total / 20);
      }
      task.lastTime = result.data.comments[0].addTime;
      task.lastId = result.data.comments[0].contentId;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, () => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1;
    const option = {};
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `${this.settings.iqiyi.list}${task.albumid}&tvid=${task.aid}&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('爱奇艺评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('爱奇艺评论数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          if (!result.data.comments) {
            page += 1;
            cb();
            return;
          }
          this.deal(task, result.data.comments, () => {
            if (task.isEnd) {
              callback(null, 'add_0');
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
      comment;
    async.whilst(
      () => index < length,
      (cb) => {
        if (task.commentId === comments[index].contentId ||
          task.commentTime >= comments[index].addTime) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].contentId,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: comments[index].addTime,
          support: comments[index].counterList.likes,
          step: comments[index].counterList.downs,
          reply: comments[index].counterList.replies,
          c_user: {
            uid: comments[index].userInfo.uid,
            uname: comments[index].userInfo.uname,
            uavatar: comments[index].userInfo.icon
          }
        };
        // console.log(comment);
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
