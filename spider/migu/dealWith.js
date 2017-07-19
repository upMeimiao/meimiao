/**
 * Created by junhao on 16/6/21.
 */
const async = require('neo-async');
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
    this.getUser(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }
  getUser(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.gumi.list + task.id}&pageNo=1`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('用户主页请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('列表解析失败', e);
        callback(e);
        return;
      }
      const user = {
        bid: task.id,
        platform: task.p,
        fans_num: result.data.userInfo.fansNum
      };
      task.total = result.data.total;
      // this.sendUser(user);
      this.sendStagingUser(user);
      this.getVideoList(task, () => {
        callback();
      });
    });
  }
  sendUser(user) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
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
        logger.debug('咪咕动漫用户:', `${user.bid} back_end`);
      } else {
        logger.error('咪咕动漫用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  sendStagingUser(user) {
    const option = {
      url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
      data: user
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
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
        logger.debug('咪咕动漫用户:', `${user.bid} back_end`);
      } else {
        logger.error('咪咕动漫用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getVideoList(task, callback) {
    const option = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest'
        }
      },
      total = task.total % 20 === 0 ? task.total / 20 : Math.ceil(task.total / 20);
    let page = 1;
    async.whilst(
      () => page <= Number(total),
      (cb) => {
        option.url = `${this.settings.spiderAPI.gumi.list + task.id}&pageNo=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('视频列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('列表解析失败', e);
            cb();
            return;
          }
          this.deal(task, result.data.opusList, (error) => {
            if (error) {
              cb(error);
              return;
            }
            page += 1;
            cb();
          });
        });
      },
      (err) => {
        callback(err);
      }
    );
  }
  deal(task, list, callback) {
    let index = 0;
    async.whilst(
      () => index < list.length,
      (cb) => {
        this.media(task, list[index], (err) => {
          if (err) {
            cb(err);
            return;
          }
          index += 1;
          cb();
        });
      },
      (err) => {
        callback(err);
      }
    );
  }
  media(task, video, callback) {
    let media, tags = '', _class = '';
    for (const [key, value] of video.tagList.entries()) {
      tags += `,${value.tagName}`;
    }
    for (const [key, value] of video.themeList.entries()) {
      _class += `,${value.themeName}`;
    }
    async.parallel(
      [
        (cb) => {
          this.getComment(video.hwOpusId, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        media = {
          bid: task.id,
          author: task.name,
          platform: task.p,
          aid: video.hwOpusId,
          title: spiderUtils.stringHandling(video.opusName, 100),
          desc: spiderUtils.stringHandling(video.opusDesc, 100),
          play_num: video.attention,
          v_img: video.opusDetailUrl,
          comment_num: result[0],
          a_create_time: parseInt(video.opusItemLastUpdateTime / 1000, 10),
          tag: tags.replace(',', ''),
          forward_num: video.favoriteCount,
          long_t: Math.round(video.playDuration),
          class: _class.replace(',', '')
        };
        // logger.debug(media);
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getComment(vid, callback) {
    const options = {
      url: this.settings.spiderAPI.gumi.comment + vid,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        Referer: `http://m.migudm.cn/ugc/${vid}.html`,
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    request.post(logger, options, (err, result) => {
      if (err) {
        logger.error(err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(e);
        callback(e);
        return;
      }
      callback(null, result.data.totalCmt);
    });
  }
}
module.exports = dealWith;