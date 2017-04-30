/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request');
const async = require('async');
const Utils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');

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
    this.getCommentId(task, (err, result) => {
      if (result == 'add_0') {
        return callback(null);
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  getCommentId(task, callback) {
    const option = {
      url: this.settings.weishi.vidHtml + task.aid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('微视的DOM结构请求失败');
        return this.getCommentId(task, callback);
      }
      let $ = cheerio.load(result.body),
        pagetime = $('ul[class="pt10"]>li');
      if (!pagetime) {
        logger.debug('微视请求的源码结构发生改变');
        return this.getCommentId(task, callback);
      }
      pagetime = pagetime.eq(pagetime.length - 1).attr('timestamp');
      this.totalPage(task, pagetime, (err, result) => {
            	callback(null, result);
      });
    });
  }
  totalPage(task, pagetime, callback) {
    let option = {
        url: `${this.settings.weishi.list2}&id=${task.aid}&pageflag=0&pagetime=0&lastid=0`,
        referer: 'http://wsi.qq.com',
        ua: 3,
        own_ua: 'Weishi/3.0.2 (iPhone; iPhone; iPhone OS 10.2.1; zh_CN)'
      },
      total = 0;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('微视评论总量请求失败', err);
        return this.totalPage(task, callback);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('微视评论数据解析失败');
        logger.info(result.body);
        return this.totalPage(task, callback);
      }
      task.cNum = result.data.total;
      if ((task.cNum - task.commentNum) <= 0) {
        return callback(null, 'add_0');
      }
      if (task.commentNum <= 0) {
        total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20);
      } else {
        total = (task.cNum - task.commentNum);
        total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20);
      }
      task.lastTime = result.data.info[0].timestamp;
      task.lastId = result.data.info[0].id;
      task.addCount = task.cNum - task.commentNum;
      this.commentList(task, total, (err) => {
        callback();
      });
    });
  }
  commentList(task, total, callback) {
    let page = 1,
      pageflag = 0,
      pagetime = 0,
      lastid = 0,
      option;
    async.whilst(
			() => page <= total,
			(cb) => {
  option = {
    url: `${this.settings.weishi.list2}&id=${task.aid}&pageflag=${pageflag}&pagetime=${pagetime}&lastid=${lastid}&r=${new Date().getTime()}`,
    referer: 'http://wsi.qq.com',
    ua: 3,
    own_ua: 'Weishi/3.0.2 (iPhone; iPhone; iPhone OS 10.2.1; zh_CN)'
  };
  request.get(logger, option, (err, result) => {
    if (err) {
      logger.debug('微视评论列表请求失败', err);
      return cb();
    }
    try {
      result = JSON.parse(result.body);
    } catch (e) {
      logger.debug('微视评论数据解析失败');
      logger.info(result);
      return cb();
    }
    result.data.info = result.data.reco ? result.data.reco.info : result.data.info;
    lastid = result.data.info[result.data.info.length - 1].id;
    pagetime = result.data.info[result.data.info.length - 1].timestamp;
    this.deal(task, result.data.info, (err) => {
      if (task.isEnd) {
        return callback();
      }
      pageflag = 2;
      page++;
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
      comment;
    async.whilst(
			() => index < length,
			(cb) => {
  if (task.commentId == comments[index].id || task.commentTime >= comments[index].timestamp) {
    task.isEnd = true;
    return callback();
  }
  comment = {
    cid: comments[index].id,
    content: Utils.stringHandling(comments[index].origtext),
    platform: task.p,
    bid: task.bid,
    aid: task.aid,
    ctime: comments[index].timestamp,
    c_user: {
      uid: comments[index].uid,
      uname: comments[index].name,
      uavatar: `${comments[index].head}/74`
    }
  };
  Utils.commentCache(this.core.cache_db, comment);
				// Utils.saveCache(this.core.cache_db,'comment_cache',comment)
  index++;
  cb();
},
			(err, result) => {
  callback();
}
		);
  }

}

module.exports = dealWith;
