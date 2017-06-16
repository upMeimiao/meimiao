/**
* Created by junhao on 2017/2/10.
*/
const async = require('neo-async');
const req = require('request');
const Utils = require('../../lib/spiderUtils');

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
    this.commentInfo(task, () => {
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  commentInfo(task, callback) {
    let offset = 0,
      cycle = true;
    const option = {
      method: 'POST',
      // proxy: 'http://127.0.0.1:56777',
      url: 'https://www.facebook.com/ajax/ufi/comment_fetch.php',
      qs: { dpr: '1' },
      headers:
      {
        'cache-control': 'no-cache',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        referer: `https//www.facebook.com/${task.bid}/videos/vb.${task.bid}/${task.aid}/?type=3&theater`,
        cookie: 'locale=zh_CN; datr=uarsWNHwHCDMME4QegGkXoHN;'
      },
      formData:
      {
        ft_ent_identifier: task.aid,
        offset: 0,
        length: 50,
        orderingmode: 'recent_activity',
        feed_context: '{"story_width":230,"is_snowlift":true,"fbfeed_context":true}',
        __user: '0',
        __a: '1',
        __dyn: '5V8WXxaAcomgDxKS5o9FEbFbGEW8xdLFwgoqwWhEnz8nyUdUb8a-exebmbxK5WxucDKaxeUW2y5pQ12VVojxCaCx3ypUkgmxWcwJwkEG9J7wHx61cxy5FEG48B0Wwwh8gUW1MBg9V8aE8o98pKHxC6ElBy8pxO12y9E9oKfxy5uaw',
        lsd: 'AVoSHAgn'
      }
    };
    async.whilst(
      () => cycle,
      (cb) => {
        option.formData.offset = offset;
        req(option, (error, response, body) => {
          if (error) {
            logger.debug('facebook的评论接口请求失败', error);
            cb();
            return;
          }
          if (response.statusCode !== 200) {
            logger.debug('评论状态码错误', response.statusCode);
            cb();
            return;
          }
          try {
            body = body.replace('for (;;);', '').replace(/[\n\r]/g, '');
            body = JSON.parse(body);
          } catch (e) {
            logger.debug('解析失败', body);
            cb();
            return;
          }
          body = body.jsmods.require[0][3][1];
          if (!task.lastId) {
            task.lastId = body.comments[0].id;
          }
          this.deal(task, body, () => {
            if (offset >= task.cNum) {
              cycle = false;
            }
            if (task.isEnd) {
              cycle = false;
            }
            offset += 50;
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
    let length = comments.comments.length,
      index = 0,
      cid,
      comment,
      author;
    async.whilst(
      () => index < length,
      (cb) => {
        cid = comments.comments[index].id;
        author = comments.comments[index].author;
        if (cid == task.commentId) {
          task.isEnd = true;
          task.cNum = Number(task.cNum) + Number(task.commentNum);
          length = 0;
          cb();
          return;
        }
        comment = {
          cid,
          content: Utils.stringHandling(comments.comments[index].body.text),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          support: comments.comments[index].likecount,
          reply: comments.commentlists.replies[cid].count,
          c_user: {
            uid: comments.profiles[author].id,
            uname: comments.profiles[author].name,
            uavatar: comments.profiles[author].thumbSrc
          }
        };
        task.cNum += 1;
        Utils.saveCache(this.core.cache_db, 'comment_cache', comment);
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
