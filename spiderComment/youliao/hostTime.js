/**
 * Created by zhupenghui on 2017/5/18.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('neo-async');

const cookieStr = () => {
  const str = 'qwertyuiopasdfghjklzxcvbnm0123456789';
  let cookie = '';
  for (let i = 0; i < 39; i += 1) {
    cookie += str.charAt(Math.floor(Math.random() * str.length));
  }
  return `wjgl_device_id=${cookie};`;
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
    task.total = 0;
    task.cookie = cookieStr();
    this.getCommentId(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback();
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
      result = result.body.replace(/[\n\s\r]/, '');
      const cid = result.match(/gcid='(\w*)/);
      if (!cid) {
        callback('cid-null');
        return;
      }
      this.getTime(task, cid[1], () => {
        callback();
      });
    });
  }
  getTime(task, cid, callback) {
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
    let pageTotal = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal / 20) :
        Math.ceil(Number(this.settings.commentTotal / 20)),
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
          if (!result.conmments || !result.conmments.length) {
            pageTotal = -1;
            cb();
            return;
          }
          this.deal(task, result.conmments, () => {
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