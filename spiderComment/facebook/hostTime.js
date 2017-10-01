/**
 * Created by dell on 2017/3/20.
 */
const Utils = require('../../lib/spiderUtils');
const async = require('neo-async');
const req = require('request');

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
            cb(null, '热门评论');
          });
        },
        time: (cb) => {
          this.commentInfo(task, () => {
            cb(null, '最新评论');
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
        cookie: task.cookies
      },
      formData:
      {
        ft_ent_identifier: task.aid,
        offset: 0,
        length: 50,
        orderingmode: 'ranked_threaded',
        feed_context: '{"story_width":230,"is_snowlift":true,"fbfeed_context":true}',
        __user: '0',
        __a: '1',
        __dyn: '5V4cjEzUGByK5A9UoGya4A5EWq2WiWF298yfirWo8otUKezob4q2i5UK3u2CEaUgxebkwy8xa5WjzHz9XDG4XzEa8iGta3_DBxe6rCCyVeFFUkgmUnAz8lUlwQxSayrhVo9ohxGbwBxrxqrXG49Z1G7WxR4ypKexm8xqawDDh45EgyouCwTAypUhKHxCqdKbyaBy8OcxO12zUryoK7Uy5uaK9yUaopJa9gK',
        fb_dtsg: 'AQF7poz_bBtc:AQFlEi2AAWFb'
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
          if (body.comments.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          if (offset >= this.settings.commentTotal) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, body, () => {
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
        referer: `https//www.facebook.com/${task.bid}/videos/vb.${task.bid}/${task.did}/?type=3&theater`,
        cookie: task.cookies
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
        __dyn: '5V4cjEzUGByK5A9UoGya4A5EWq2WiWF298yfirWo8otUKezob4q2i5UK3u2CEaUgxebkwy8xa5WjzHz9XDG4XzEa8iGta3_DBxe6rCCyVeFFUkgmUnAz8lUlwQxSayrhVo9ohxGbwBxrxqrXG49Z1G7WxR4ypKexm8xqawDDh45EgyouCwTAypUhKHxCqdKbyaBy8OcxO12zUryoK7Uy5uaK9yUaopJa9gK',
        fb_dtsg: 'AQF7poz_bBtc:AQFlEi2AAWFb'
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
          if (body.comments.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          if (offset >= this.settings.commentTotal) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, body, () => {
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
    const length = comments.comments.length;
    let index = 0,
      cid,
      comment,
      author;
    async.whilst(
      () => index < length,
      (cb) => {
        cid = comments.comments[index].id;
        author = comments.comments[index].author;
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