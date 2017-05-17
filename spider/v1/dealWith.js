/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('async');
const cheerio = require('cheerio');
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
    async.parallel(
      {
        user: (cb) => {
          this.getFans(task, () => {
            cb(null, '用户信息已返回');
          });
        },
        video: (cb) => {
          this.getVidTotal(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '视频信息已返回');
          });
        }
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        logger.debug(`${task.id}_result:`, result);
        callback(null, task.total);
      }
    );
  }
  getFans(task, callback) {
    let id;
    if (task.id === task.encodeId) {
      id = task.id;
    } else {
      id = task.encodeId;
    }
    const option = {
      url: `http://user.v1.cn/his/getAllCountByUserId/${id}.json`,
      referer: `http://user.v1.cn/his/video/${id}.jhtml`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback();
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
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: result.obj.fansCount
      };
      task.total = result.obj.videoCount;
      this.sendUser(user, () => {
        callback();
      });
      this.sendStagingUser(user);
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
  getVidTotal(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.v1.videoList + task.id}&p=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('接口请求错误 : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      const page = result.body.page_num;
      this.getVidList(task, page, () => {
        callback();
      });
    });
  }

  getVidList(task, page, callback) {
    const option = {};
    let length = null,
      content = null,
      sign = 0;
    async.whilst(
      () => sign < page,
      (cb) => {
        option.url = `${this.settings.spiderAPI.v1.videoList + task.id}&p=${sign}`;
        request.get(logger, option, (err, result) => {
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
          length = result.body.data.length;
          content = result.body.data;
          this.deal(task, content, length, () => {
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
  deal(task, user, length, callback) {
    let index = 0;
    async.whilst(
      () => index < length,
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
          v_url: result[0].wabSiteUrl,
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
      url: `http://www.v1.cn/video/v_${vid}.jhtml`
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
      url: `http://static.app.m.v1.cn/www/mod/mob/ctl/videoDetails/act/get/vid/${vid}/pcode/010210000/version/4.5.4.mindex.html`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('单个视频接口请求错误 : ', err);
        if (num <= 1) {
          this.getVidInfo(vid, num += 1, callback);
          return;
        }
        callback(null, 'next');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('单个视频json数据解析失败');
        logger.info(result);
        callback(e);
        return;
      }
      callback(null, result.body.obj.videoDetail);
    });
  }
}
module.exports = dealWith;