/**
* Created by zhupenghui on 2017/7/4.
*/
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const cookieStr = () => {
  const str = 'qwertyuiopasdfghjklzxcvbnm0123456789';
  let cookie = '';
  for (let i = 0; i < 39; i += 1) {
    cookie += str.charAt(Math.floor(Math.random() * str.length));
  }
  return `wjgl_device_id=${cookie};`;
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
    task.cookie = cookieStr();
    this.getCommentId(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getCommentId(task, callback) {
    const option = {
      url: `http://wjgl.xlmc.xunlei.com/video/share?videoId=${task.aid}&hmsr=youliaoios&newRec=true`,
      headers: {
        'Upgrade-Insecure-Requests': 1,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        cookie: task.cookie
      }
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('视频DOM请求失败', err);
        callback(err);
        return;
      }
      result = result.body.replace(/[\n\s\r]/g, '');
      const cid = result.match(/gcid='(\w*)/);
      if (!cid) {
        callback('cid-null');
        return;
      }
      this.getTotalList(task, cid[1], () => {
        callback();
      });
    });
  }
  getTotalList(task, cid, callback) {
    const option = {
      url: this.settings.youliao,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'X-Requested-With',
        cookie: task.cookie
      },
      data: {
        tid: cid,
        typeId: 1,
        lastId: '',
        type: 'loadmore',
        pageSize: 20,
        category: 'new'
      }
    };
    let length = 0;
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        this.getTotalList(task, cid, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('评论列表解析失败', result.body);
        this.getTotalList(task, cid, callback);
        return;
      }
      if (!result.conmments || !result.conmments.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      // logger.info(result);
      task.cNum = result.rcount;
      if (Number(task.cNum) - Number(task.commentNum) <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (Number(task.cNum) - Number(task.commentNum) > 0) {
        length = Number(task.cNum) - Number(task.commentNum);
      }
      task.lastId = result.conmments[0].cid;
      task.lastTime = parseInt(result.conmments[0].time / 1000, 10);
      task.addCount = length;
      this.commentList(task, cid, () => {
        callback();
      });
    });
  }
  commentList(task, cid, callback) {
    const option = {
      url: this.settings.youliao,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'X-Requested-With',
        cookie: task.cookie
      },
      data: {
        tid: cid,
        typeId: 1,
        type: 'loadmore',
        pageSize: 20,
        category: 'new'
      }
    };
    let pageTotal = Number(task.addCount) % 20 === 0 ?
        Number(task.addCount / 20) : Math.ceil(Number(task.addCount / 20)),
      page = 1,
      lastId = '';
    async.whilst(
      () => page <= pageTotal,
      (cb) => {
        option.data.lastId = lastId;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.error('评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('列表解析失败', result.body);
            cb();
            return;
          }
          logger.info(result.conmments);
          this.deal(task, result.conmments, () => {
            if (task.isEnd) {
              pageTotal = -1;
            }
            lastId = result.conmments[result.conmments.length - 1].cid;
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
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        time = parseInt(comments[index].time / 1000, 10);
        if (task.commentId == comments[index].cid || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].cid,
          content: spiderUtils.stringHandling(comments[index].comment),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: comments[index].gcount,
          reply: '',
          c_user: {
            uid: comments[index].uid,
            uname: comments[index].userName,
            uavatar: comments[index].userImg
          }
        };
        spiderUtils.saveCache(this.core.cache_db, 'comment_cache', comment);
        // logger.debug(comment);
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
