/**
 * Created by junhao on 16/6/21.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');

const _Callback = function (data) {
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
      [
        (cb) => {
          this.getFan(task, 0, () => {
            logger.debug('用户粉丝数请求完成');
            cb(null);
          });
        },
        (cb) => {
          this.getVidList(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            logger.debug('用户视频数据请求完成');
            cb(null);
          });
        }
      ],
        (err) => {
          if (err) {
            callback(err);
          } else {
            callback(null, task.total);
          }
        }
      );
  }
  getFan(task, times, callback) {
    if (times > 5) {
      callback();
      return;
    }
    const option = {
      url: `https://h5.qzone.qq.com/proxy/domain/r.qzone.qq.com/cgi-bin/tfriend/cgi_like_check_and_getfansnum.cgi?uin=${task.id}&mask=3&fupdate=1`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('用户粉丝数请求失败');
        times += 1;
        this.getFan(task, times, callback);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('用户粉丝数解析失败');
        logger.info(result);
        times += 1;
        this.getFan(task, times, callback);
        return;
      }
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: result.data.data.total
      };
      this.sendUser(user);
      this.sendStagingUser(user);
      callback();
    });
  }
  sendUser(user) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, back) => {
      if (err) {
        logger.error('occur error : ', err);
        logger.info(`返回QQ空间视频用户 ${user.bid} 连接服务器失败`);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`QQ空间视频用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('QQ空间视频用户:', `${user.bid} back_end`);
      } else {
        logger.error('QQ空间视频用户:', `${user.bid} back_error`);
        logger.info(back);
        logger.info('user info: ', user);
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
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getVidList(task, callback) {
    let sign = 0,
      start = 0,
      page = 1,
      num = 0;
    const option = {
      ua: 1
    };
    async.whilst(
      () => sign < Math.min(page, 500),
      (cb) => {
        option.url = `${this.settings.spiderAPI.qzone.listVideo + task.id}&start=${start}`;
        option.referer = `https://h5.qzone.qq.com/proxy/domain/ic2.qzone.qq.com/cgi-bin/feeds/feeds_html_module?i_uin=${task.id}&mode=4&previewV8=1&style=31&version=8&needDelOpr=true&transparence=true&hideExtend=false&showcount=10&MORE_FEEDS_CGI=http%3A%2F%2Fic2.qzone.qq.com%2Fcgi-bin%2Ffeeds%2Ffeeds_html_act_all&refer=2&paramstring=os-win7|100`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('接口请求错误 : ', err);
            if (num <= 1) {
              return setTimeout(() => {
                num += 1;
                logger.debug('300毫秒之后重新请求一下当前列表');
                cb();
              }, 300);
            }
            return setTimeout(() => {
              start += 10;
              num = 0;
              logger.debug('300毫秒之后重新请求下一页列表');
              cb();
            }, 300);
          }
          num = 0;
          try {
            result = eval(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info(result);
            return callback(e);
          }
          if (!result.data) {
            if (num <= 1) {
              return setTimeout(() => {
                num += 1;
                logger.debug('300毫秒之后重新请求一下');
                cb();
              }, 300);
            }
            return setTimeout(() => {
              num = 0;
              start += 10;
              logger.debug('300毫秒之后重新请求下一页列表');
              cb();
            }, 300);
          }
          num = 0;
          if (!result.data.friend_data) {
            if (num <= 1) {
              return setTimeout(() => {
                num += 1;
                logger.debug('300毫秒之后重新请求一下');
                cb();
              }, 300);
            }
            return setTimeout(() => {
              num = 0;
              start += 10;
              logger.debug('300毫秒之后重新请求下一页列表');
              cb();
            }, 300);
          }
          num = 0;
          const length = result.data.friend_data.length - 1;
          task.total += length;
          if (length <= 0) {
            logger.debug('已经没有数据');
            page = 0;
            sign += 1;
            return cb();
          }
          this.deal(task, result.data, length, () => {
            sign += 1;
            page += 1;
            start += 20;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  deal(task, user, length, callback) {
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getAllInfo(task, user.friend_data[index], () => {
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
    const $ = cheerio.load(video.html);
    if (!$('div').hasClass('f-ct-video')) {
      callback();
      return;
    }
    async.parallel([
      (cb) => {
        this.getVideoInfo(task, video, (err, result) => {
          cb(null, result);
        });
      },
      (cb) => {
        this.getVidCom(task, video.key, (err, data) => {
          cb(null, data);
        });
      }
    ], (err, result) => {
      if (result[0] === '抛掉当前的') {
        logger.debug('直接请求下一个视频');
        callback();
        return;
      }
      if (!result[0].singlefeed) {
        callback();
        return;
      }
      const media = {
        author: video.nickname,
        platform: task.p,
        bid: task.id,
        aid: video.key,
        title: spiderUtils.stringHandling(result[0].singlefeed['4'].summary, 100),
        support: result[0].singlefeed['11'].num,
        long_t: result[0].singlefeed['7'].videotime / 1000,
        v_img: result[0].v_img,
        read_num: result[0].singlefeed['20'].view_count,
        v_url: result[0].singlefeed['0'].curlikekey,
        a_create_time: video.abstime,
        comment_num: result[1].cmtnum,
        forward_num: result[1].fwdnum,
        play_num: result[0].singlefeed['7'].videoplaycnt
      };
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }

  getVideoInfo(task, video, callback) {
    const option = {
      url: `${this.settings.spiderAPI.qzone.videoInfo + task.id}&appid=${video.appid}&tid=${video.key}&ugckey=${task.id}_${video.appid}_${video.key}_&qua=V1_PC_QZ_1.0.0_0_IDC_B`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('单个视频请求失败 ', err);
        return callback(null, '抛掉当前的');
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('_Callback数据解析失败');
        logger.info(result);
        return callback(null, '抛掉当前的');
      }
      if (!result.data) {
        return callback(null, '抛掉当前的');
      }
      result = result.data.all_videolist_data[0];
      if (!result || !result.singlefeed) {
        return callback(null, '抛掉当前的');
      }
      if (result.singlefeed['1'] && result.singlefeed['1'].user && result.singlefeed['1'].user.uin != task.id) {
        // logger.debug('当前视频被删掉或者是数据错误');
        callback(null, '抛掉当前的');
        return;
      }
      if (!result.singlefeed['7'].coverurl['0']) {
        result.v_img = '';
      } else if (!result.singlefeed['7'].coverurl['0'].url) {
        result.v_img = '';
      } else {
        result.v_img = result.singlefeed['7'].coverurl['0'].url;
      }
      callback(null, result);
    });
  }
  getVidCom(task, vid, callback) {
    const option = {
      url: `https://h5.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msgdetail_v6?uin=${task.id}&tid=${vid}&t1_source=1&ftype=0&sort=0&pos=0&num=20&code_version=1&format=jsonp&need_private_comment=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论总量请求失败');
        return callback(null, '');
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('评论量数据解析失败');
        return callback(null, '');
      }
      callback(null, result);
    });
  }
}
module.exports = dealWith;