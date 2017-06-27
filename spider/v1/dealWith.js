/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('neo-async');
const cheerio = require('cheerio');
const fetchUrl = require('fetch').fetchUrl;
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const jsonp = function (data) {
  return data;
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
    task.total = 0;
    this.getFans(task, () => {
      callback(null, task.total);
    });
  }
  getFans(task, callback) {
    const option = {
      url: this.settings.spiderAPI.v1.newList,
      headers: {
        'User-Agent': 'V1_vodone/6.0.1 (iPhone; iOS 10.3.2; Scale/3.00)',
        'Content-Type': 'multipart/form-data; boundary=Boundary+A967927714B045D1'
      },
      data: {
        p: 0,
        s: 20,
        tid: task.id
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('V1 json数据解析失败');
        logger.error(result);
        callback(e);
        return;
      }
      if (!result.body || !result.body.data) {
        callback('v1-list-error');
        return;
      }
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: result.body.data.fans_num
      };
      task.total = result.body.data.video_num;
      // this.sendUser(user);
      this.sendStagingUser(user);
      this.getVidList(task, () => {
        callback();
      });
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
        logger.error(`V1 ${user.bid} json数据解析失败`);
        logger.info(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('V1:', `${user.bid} back_end`);
      } else {
        logger.error('V1:', `${user.bid} back_error`);
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
  getVidList(task, callback) {
    const option = {
        url: this.settings.spiderAPI.v1.newList,
        headers: {
          'User-Agent': 'V1_vodone/6.0.1 (iPhone; iOS 10.3.2; Scale/3.00)',
          'Content-Type': 'multipart/form-data; boundary=Boundary+A967927714B045D1'
        },
        data: {
          p: 0,
          s: 20,
          tid: task.id
        }
      },
      page = Number(task.total) % 20 === 0 ?
        Number(task.total) / 20 :
        Math.ceil(Number(task.total) / 20);
    let sign = 0;
    async.whilst(
      () => sign < page,
      (cb) => {
        option.data.p = sign;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.error('列表接口请求错误 : ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          this.deal(task, result.body.data.video_list.data, () => {
            sign += 1;
            cb();
          });
        });
      },
      () => {
        logger.debug('当前用户数据请求完成');
        callback();
      }
    );
  }
  deal(task, user, callback) {
    let index = 0;
    logger.debug(user.length);
    async.whilst(
      () => index < user.length,
      (cb) => {
        this.getAllInfo(task, user[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getAllInfo(task, video, callback) {
    const num = 0;
    async.parallel(
      [
        (cb) => {
          this.getVidInfo(video.vid, num, (err, result) => {
            cb(err, result);
          });
        },
        (cb) => {
          this.getVideoInfo(video.vid, num, (err, result) => {
            cb(err, result);
          });
        },
        (cb) => {
          this.getSupport(video.vid, (err, result) => {
            cb(err, result);
          });
        }
      ],
      (err, result) => {
        if (result[0] === 'next') {
          callback();
          return;
        }
        const media = {
          author: task.name,
          platform: task.p,
          bid: task.id,
          aid: video.vid,
          title: video.title.replace(/"/g, ''),
          comment_num: result[0].comments,
          class: result[0].videoCategory ? result[0].videoCategory.name : '',
          tag: result[1].tag,
          desc: result[1].desc.substring(0, 100).replace(/"/g, ''),
          support: result[2] ? result[2].msg : null,
          forward_num: result[0].forward,
          v_img: video.pic,
          play_num: result[0].playNum,
          v_url: `http://www.v1.cn/video/${video.vid}.shtml`,
          a_create_time: moment(video.create_time).format('X')
        };
        if (!media.support) {
          delete media.support;
        }
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getSupport(vid, callback) {
    const option = {
      url: `http://user.v1.cn/openapi/getVideoPraise.json?videoId=${vid}&callback=jsonp`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('点赞量请求失败');
        callback(null, null);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('点赞量解析失败');
        logger.info(result);
        callback(null, null);
        return;
      }
      callback(null, result);
    });
  }
  getVideoInfo(vid, num, callback) {
    const option = {
      url: `http://www.v1.cn/video/${vid}.jhtml`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('单个DOM接口请求错误 : ', err);
        if (num <= 1) {
          this.getVideoInfo(vid, num += 1, callback);
          return;
        }
        callback(null, { desc: '', tag: '', support: 0 });
        return;
      }
      const $ = cheerio.load(result.body),
        tag = this.getTag($('li.summaryList_item ul.tagList li')),
        desc = $('p.summaryList_long').text(),
        res = {
          desc,
          tag,
        };
      callback(null, res);
    });
  }
  getTag(desc) {
    let str = '';
    for (let i = 0; i < desc.length; i += 1) {
      if (desc.eq(i).text().replace(/\s/g, '') === '') {
        str += '';
      } else {
        str += `${desc.eq(i).text()} `;
      }
    }
    return str;
  }
  getVidInfo(vid, num, callback) {
    const option = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      }
    };
    fetchUrl(`http://static.app.m.v1.cn/www/mod/mob/ctl/videoDetails/act/get/vid/${vid}/pcode/010210000/version/4.5.4.mindex.html`, option, (err, meta, body) => {
      if (err) {
        logger.error('单个视频接口请求错误 : ', err);
        callback(null, 'next');
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error('单个视频json数据解析失败', body);
        if (num > 1) {
          num += 1;
          this.getVidInfo(vid, num, callback);
          return;
        }
        callback(null, { comments: '', videoCategory: '', forward: '', playNum: '' });
        return;
      }
      if (!body.body || !body.body.obj || !body.body.obj.videoDetail) {
        if (num > 1) {
          num += 1;
          this.getVidInfo(vid, num, callback);
          return;
        }
        callback(null, { comments: '', videoCategory: '', forward: '', playNum: '' });
        return;
      }
      callback(null, body.body.obj.videoDetail);
    });
  }
}
module.exports = dealWith;