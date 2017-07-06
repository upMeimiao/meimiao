/**
* Created by zhupenghui on 2017/7/4.
*/
const async = require('neo-async');
const zlib = require('zlib');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

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
    this.getTotalList(task, () => {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getTotalList(task, callback) {
    const option = {
      url: this.settings.xiaokaxiu,
      encoding: 1,
      headers: {
        'User-Agent': 'YXCaptureApp/1.7.6 (iPhone; iOS 10.3.2; Scale/3.00)',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: {
        _secdata: 'fCuZ0_Ms-qbyC4qqBOeeoMQy8R5R2hUJvIVd6fWGz0nLP1Pv2ohw19C6xI6dSjkapKvrMNoEDkqaSe3_Vhg2WvCrtCSjqLaW_Y5uP8vqFNR4iTaKSaSH5k7m8AVpQrckFxDVyYyLKrHmwFr06TXTQ_5TJi55BBf_1nc8avzmZTrE-3s9AkP5y8JmownDLlE6wSzczGa3s_qFV_H36O5cX29ij5AVtfFkqfszFzuF2p86w8G9eXondEFTldsc17YBISXniJR1k6v8f6PtiV2xrMpZV6DGzfuYVmPnp6ouEuZoWZ3Mz2Lqd2qHCRcAHjmKbBfraMvpEskjcc7aB_cPrVWqUScztHKtQ3EywufXxPu2dQ4thBArQ3-loiShxdhkkwRJb-ErTpLxC2UF_bDIbFlhShNZxL6_dL42tJr28pf2Ovutg0pELRhNmae-_kasBPqhbbgEaAmy2mcdiKrlrA..',
        limit: 20,
        page: 1,
        videoid: task.aid
      }
    };
    let length = 0;
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('评论列表请求失败', err);
        this.getTotalList(task, callback);
        return;
      }
      try {
        result = JSON.parse(zlib.unzipSync(result.body).toString());
      } catch (e) {
        logger.error('评论列表解析失败', result.body);
        this.getTotalList(task, callback);
        return;
      }
      if (!result.data || !result.data.list || !result.data.list.length) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      task.cNum = result.data.total;
      if (Number(task.cNum) - Number(task.commentNum) <= 0) {
        task.lastId = task.commentId;
        task.lastTime = task.commentTime;
        callback();
        return;
      }
      if (Number(task.cNum) - Number(task.commentNum) > 0) {
        length = Number(task.cNum) - Number(task.commentNum);
      }
      task.lastId = result.data.list[0].id;
      task.lastTime = result.data.list[0].createtime;
      task.addCount = length;
      this.commentList(task, () => {
        callback();
      });
    });
  }
  commentList(task, callback) {
    const option = {
      url: this.settings.xiaokaxiu,
      encoding: 1,
      headers: {
        'User-Agent': 'YXCaptureApp/1.7.6 (iPhone; iOS 10.3.2; Scale/3.00)',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: {
        _secdata: 'fCuZ0_Ms-qbyC4qqBOeeoMQy8R5R2hUJvIVd6fWGz0nLP1Pv2ohw19C6xI6dSjkapKvrMNoEDkqaSe3_Vhg2WvCrtCSjqLaW_Y5uP8vqFNR4iTaKSaSH5k7m8AVpQrckFxDVyYyLKrHmwFr06TXTQ_5TJi55BBf_1nc8avzmZTrE-3s9AkP5y8JmownDLlE6wSzczGa3s_qFV_H36O5cX29ij5AVtfFkqfszFzuF2p86w8G9eXondEFTldsc17YBISXniJR1k6v8f6PtiV2xrMpZV6DGzfuYVmPnp6ouEuZoWZ3Mz2Lqd2qHCRcAHjmKbBfraMvpEskjcc7aB_cPrVWqUScztHKtQ3EywufXxPu2dQ4thBArQ3-loiShxdhkkwRJb-ErTpLxC2UF_bDIbFlhShNZxL6_dL42tJr28pf2Ovutg0pELRhNmae-_kasBPqhbbgEaAmy2mcdiKrlrA..',
        limit: 20,
        page: 1,
        videoid: task.aid
      }
    };
    let pageTotal = task.addCount % 20 === 0 ? task.addCount / 20 : Math.ceil(task.addCount / 20),
      page = 1, comment = [];
    async.whilst(
      () => page <= pageTotal,
      (cb) => {
        option.data.page = page;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.error('评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(zlib.unzipSync(result.body).toString());
          } catch (e) {
            logger.error('列表解析失败', result.body);
            cb();
            return;
          }
          // logger.debug(result.data.list);
          if (!result.data || !result.data.list || !result.data.list.length) {
            pageTotal = -1;
            cb();
            return;
          }
          comment = result.data.list.concat(result.data.hotlist);
          this.deal(task, comment, () => {
            if (task.isEnd) {
              pageTotal = -1;
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
    let index = 0,
      time,
      comment;
    async.whilst(
      () => index < comments.length,
      (cb) => {
        time = comments[index].createtime;
        if (task.commentId == comments[index].id || task.commentTime >= time) {
          task.isEnd = true;
          callback();
          return;
        }
        comment = {
          cid: comments[index].id,
          content: spiderUtils.stringHandling(comments[index].content),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          ctime: time,
          step: '',
          support: comments[index].praises,
          reply: '',
          c_user: {
            uid: comments[index].memberid,
            uname: comments[index].nickname,
            uavatar: comments[index].avatar
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
