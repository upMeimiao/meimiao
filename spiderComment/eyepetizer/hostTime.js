/**
 * Created by zhupenghui on 2017/5/18.
 */
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const async = require('neo-async');

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
    async.parallel(
      {
        hot: (cb) => {
          this.getHot(task, () => {
            cb();
          });
        },
        time: (cb) => {
          this.getTime(task, () => {
            cb();
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
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    let pageTotal = Number(this.settings.commentTotal) % 50 === 0 ?
        Number(this.settings.commentTotal / 50) :
        Math.ceil(Number(this.settings.commentTotal / 50)),
      page = 1, start = '';
    async.whilst(
      () => page <= pageTotal,
      (cb) => {
        option.url = `${this.settings.kaiyan.hot + task.aid}&num=50&start=${start}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('热门评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('热门列表解析失败', result.body);
            cb();
            return;
          }
          if (!result.itemList || !result.itemList.length) {
            pageTotal = -1;
            cb();
            return;
          }
          this.deal(task, result.itemList, () => {
            start += 50;
            page += 1;
            cb();
          });
        });
      },
      () => callback()
    );
  }
  getTime(task, callback) {
    const option = {
      ua: 3,
      own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    let pageTotal = Number(this.settings.commentTotal) % 50 === 0 ?
        Number(this.settings.commentTotal / 50) :
        Math.ceil(Number(this.settings.commentTotal / 50)),
      page = 1, lastId = '';
    async.whilst(
      () => page <= pageTotal,
      (cb) => {
        option.url = `${this.settings.kaiyan.time + task.aid}&num=50&lastId=${lastId}`;
        request.get(logger, option, (err, result) => {
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
          if (!result.itemList || !result.itemList.length) {
            pageTotal = -1;
            cb();
            return;
          }
          this.deal(task, result.itemList, () => {
            lastId = result.itemList[result.itemList.length - 1].data.sequence;
            page += 1;
            cb();
          });
        });
      },
      () => callback()
    );
  }
  deal(task, comments, callback) {
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        if (comments[index].data.text) {
          index += 1;
          cb();
          return;
        }
        time = parseInt(comments[index].data.createTime / 1000, 10);
        comment = {
          cid: comments[index].data.id,
          content: spiderUtils.stringHandling(comments[index].data.message),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: comments[index].data.likeCount,
          reply: '',
          c_user: {
            uid: comments[index].data.user ? comments[index].data.user.uid : '',
            uname: comments[index].data.user ? comments[index].data.user.nickname : '',
            uavatar: comments[index].data.user ? comments[index].data.user.avatar : ''
          }
        };
        task.total += 1;
        spiderUtils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
        // console.log('---', task.total);
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