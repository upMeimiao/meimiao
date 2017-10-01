/**
 * Created by zhupenghui on 17/7/5.
 */
const async = require('neo-async');
const cheerio = require('cheerio');
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
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '粉丝数完成');
          });
        },
        media: (cb) => {
          this.getList(task, () => {
            cb(null, '视频信息完成');
          });
        }
      },
      (err, result) => {
        logger.debug('result: ', result);
        callback(null, task.total);
      }
    );
  }
  getUser(task, callback) {
    const option = {
      url: `https://v.xiaokaxiu.com/u/${task.id}.html`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Upgrade-Insecure-Requests': 1
      }
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('用户主页请求失败', err);
        callback(err);
        return;
      }
      const $ = cheerio.load(result.body),
        fans_num = $('div.uk-grid.uk-grid-collapse.uk-text-center>div').eq(2).text().replace('粉丝', '');
      if (fans_num == '') {
        callback('粉丝数异常');
        return;
      }
      task.total = $('div.uk-grid.uk-grid-collapse.uk-text-center>div').eq(0).text().replace('作品', '');
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num
      };
      // this.sendUser(user, () => callback());
      this.sendStagingUser(user);
      callback();
    });
  }
  sendUser(user, callback) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`bolo ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('bolo:', `${user.bid} back_end`);
      } else {
        logger.error('bolo:', `${user.bid} back_error`);
        logger.info(result);
        logger.info('user info: ', user);
      }
      callback();
    });
  }
  sendStagingUser(user) {
    const option = {
      url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
      data: user
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('send error:', result);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getList(task, callback) {
    const option = {
      ua: 1,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        Referer: `https://v.xiaokaxiu.com/u/${task.id}.html`
      }
    };
    let cycle = true, page = 1;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.xiaokaxiu.list + task.id}&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('用户信息请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('用户信息解析失败', result.body);
            cb();
            return;
          }
          if (Number(result.result) !== 1 || !result.data || !result.data.list.length) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, result.data.list, () => {
            page += 1;
            cb();
          });
        });
      },
      () => callback()
    );
  }
  deal(task, list, callback) {
    let index = 0;
    const length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.media(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  media(task, video, callback) {
    async.parallel(
      [
        (cb) => {
          this.videoInfo(video.scid, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        const media = {
          author: task.name,
          bid: task.id,
          platform: task.p,
          aid: video.videoid,
          title: spiderUtils.stringHandling(video.title, 80),
          desc: spiderUtils.stringHandling(video.desc, 100),
          a_create_time: video.updatetime,
          v_img: video.cover,
          comment_num: result[0].comment,
          v_url: `https://v.xiaokaxiu.com/v/${video.scid}.html`,
          support: result[0].ding
        };
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        // logger.info(media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  videoInfo(scid, callback) {
    const option = {
      url: `https://v.xiaokaxiu.com/v/${scid}.html`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('视频详情请求错误', err);
        this.videoInfo(scid, callback);
        return;
      }
      const $ = cheerio.load(result.body),
        ding = $('div.uk-grid.uk-grid-collapse.uk-text-center>div').eq(0).find('span').text(),
        comment = $('div.uk-grid.uk-grid-collapse.uk-text-center>div').eq(1).find('span').text();
      if (!ding || !comment) {
        callback(null, '');
        return;
      }
      callback(null, { ding, comment });
    });
  }
}
module.exports = dealWith;