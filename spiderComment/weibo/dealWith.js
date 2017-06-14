/**
* Created by junhao on 2017/2/10.
*/
const async = require('neo-async');
const moment = require('moment');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const createTime = (time) => {
  let newTime;
  if (!time) {
    return '';
  }
  if (time.includes('刚刚')) {
    return moment().unix();
  }
  if (time.includes('秒')) {
    time = time.replace('秒', '');
    time = Number(moment().unix()) - Number(time);
    return time;
  }
  if (time.includes('分钟')) {
    time = time.replace('分钟前', '');
    time = Number(moment().unix()) - (Number(time) * 60);
    return time;
  }
  if (time.includes('今天')) {
    time = time.replace('今天', '');
    newTime = moment.unix(moment().unix()).toDate().toJSON().toString()
      .substr(0, 10);
    time = `${newTime + time}:00`;
    time = new Date(time);
    return moment(time).format('X');
  }
  if (time.includes('昨天')) {
    time = time.replace('昨天', '');
    newTime = (Number(moment().unix()) - (24 * 60 * 60));
    newTime = moment.unix(newTime).toDate().toJSON().toString()
      .substr(0, 10);
    time = `${newTime + time}:00`;
    time = new Date(time);
    return moment(time).format('X');
  }
  let timeArr = time.split(' ')[0];
  timeArr = timeArr.split('-');
  if (timeArr.length === 2) {
    time = `${new Date().getFullYear()}-${time}:00`;
    time = new Date(time);
    return moment(time).format('X');
  }
  return '';
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
    const num = 0;
    setTimeout(() => {
      this.total(task, num, (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
      });
    }, 2400);
  }
  total(task, num, callback) {
    const option = {
      url: `${this.settings.weibo.comment + task.aid}&page=1`,
      ua: 2
    };
    let total = 0;
    if (num > 2) {
      callback();
      return;
    }
    request.get(logger, option, (error, result) => {
      if (error) {
        logger.debug('微博的评论总数请求失败', error);
        setTimeout(() => {
          this.total(task, num, callback);
        }, 2400);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('微博数据解析失败', result.body);
        setTimeout(() => {
          this.total(task, num, callback);
        }, 2400);
        return;
      }
      if (result.ok != 0) {
        setTimeout(() => {
          this.total(task, num += 1, callback);
        }, 2400);
        return;
      }
      task.cNum = Number(result.total_number);
      if (task.cNum >= this.settings.weibo.commentTotal) {
        task.cNum = this.settings.weibo.commentTotal;
      }
      total = (task.cNum % 10) === 0 ? task.cNum / 10 : Math.ceil(task.cNum / 10);
      task.lastId = result.data[0].id;
      task.lastTime = createTime(result.data[0].created_at);
      task.addCount = task.cNum - task.commentNum;
      if (task.commentId == task.lastId || task.commentTime >= task.lastTime) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
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
        option.url = `${this.settings.weibo.comment + task.aid}&page=${page}`;
        request.get(logger, option, (error, result) => {
          if (error) {
            logger.error('微博评论列表请求失败', error);
            setTimeout(() => {
              cb();
            }, 2400);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('微博评论数据解析失败', result.body);
            setTimeout(() => {
              cb();
            }, 2400);
            return;
          }
          if (!result.data || result.ok != 0) {
            page += 1;
            setTimeout(() => {
              cb();
            }, 2400);
            return;
          }
          this.deal(task, result.data, () => {
            if (task.isEnd) {
              total = -1;
              setTimeout(() => {
                cb();
              }, 2400);
              return;
            }
            page += 1;
            setTimeout(() => {
              cb();
            }, 2400);
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
      time;
    async.whilst(
      () => index < length,
      (cb) => {
        // 过滤评论内容中的HTML标签，暂时先不过滤掉
        // let content = spiderUtils.clearHtml(comments[index].text)
        time = createTime(comments[index].created_at);
        if (task.commentId == comments[index].id || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].text),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          support: comments[index].like_counts,
          c_user: {
            uid: comments[index].user.id,
            uname: comments[index].user.screen_name,
            uavatar: comments[index].user.profile_image_url
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
