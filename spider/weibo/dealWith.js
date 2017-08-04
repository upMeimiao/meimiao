/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('neo-async');
const cheerio = require('cheerio');
const request = require('../../lib/request');
const trimHtml = require('trim-html');
const spiderUtils = require('../../lib/spiderUtils');

const __num = (num) => {
  if (!num) {
    return '';
  }
  if (typeof num === 'string' && isNaN(num)) {
    return 0;
  }
  return Number(num);
};
const __playNum = (num) => {
  let playNum = null;
  if (!num) {
    return '';
  }
  if (typeof num === 'string') {
    const start = num.indexOf('&play_count='),
      end = num.indexOf('&duration=');
    playNum = num.substring(start + 12, end);
  }
  if (!playNum) {
    return '';
  }
  if (playNum.includes('万')) {
    playNum = playNum.match(/(\d*)万/)[1];
    playNum = `${playNum}0000`;
    return isNaN(playNum) ? '' : Number(playNum);
  }
  if (isNaN(playNum)) {
    return '';
  }
  return Number(playNum);
};
const jsonp = (data) => data;
let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }

  todo(task, callback) {
    const time = new Date().getTime();
    task.total = 0;
    task.page = 1;
    task.fans = null;
    task.cookie = `_s_tentry=weibo.com; Apache=7877608849212.212.${time}; ULV=${time - 1000}:15:2:1:7877608849212.212.${time}:${time - 691200000};SUB=_2AkMuJQEPf8NxqwJRmPoVyGvkbop0yw_EieKYefDUJRMxHRl-yj9kqm8ztRCgVYr9W1CP99AbLmkiBvFPRIevow..;`;
    async.parallel(
      {
        fans: (cb) => {
          this.getFans(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '粉丝信息已返回');
          });
        },
        user: (cb) => {
          this.getUserInfo(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '用户信息已返回');
          });
        }
      },
      () => callback(null, task.total)
    );
  }
  getFans(task, callback) {
    const option = {
      url: this.settings.spiderAPI.weibo.fans + task.id,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        Referer: `https://m.weibo.cn/u/${task.id}`,
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('粉丝数请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('粉丝数解析失败', result.body);
        if (result.body.includes('用户不存在')) {
          callback();
        } else {
          callback(result.body);
        }
        return;
      }
      if (!result || !result.userInfo) {
        callback('粉丝数数据异常');
        return;
      }
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: result.userInfo.followers_count || ''
      };
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
    request.post(logger, option, (err, back) => {
      if (err) {
        logger.error('occur error : ', err.message);
        logger.info(`返回微博视频用户 ${user.bid} 连接服务器失败`);
        callback();
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`微博视频用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        callback();
        return;
      }
      if (back.errno === 0) {
        logger.debug('微博视频用户:', `${user.bid} back_end`);
      } else {
        logger.error('微博视频用户:', `${user.bid} back_error`);
        logger.info(back);
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
        logger.error('occur error : ', err.message);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('send error:', result);
        return;
      }
      if (result.errno === 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getUserInfo(task, callback) {
    const option = {
      url: `http://weibo.com/u/${task.id}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        cookie: task.cookie,
        referer: `http://www.weibo.com/${task.id}`
      }
    };
    this.core.proxy.getProxy((err, proxy) => {
      if (proxy === 'timeout') {
        callback();
        return;
      }
      if (!proxy) {
        this.getUserInfo(task, callback);
        return;
      }
      option.proxy = proxy;
      request.get(logger, option, (error, result) => {
        if (error) {
          logger.debug('用户的主页请求错误', error.message);
          this.core.proxy.back(proxy, false);
          this.getUserInfo(task, callback);
          return;
        }
        result = result.body.replace(/[\s\n\r\\]/g, '');
        if (!result.match(/id="(Pl_Official_MyProfileFeed__\d*)/)) {
          callback('dom结构可能出问题了');
          return;
        }
        const PI = result.match(/id="(Pl_Official_MyProfileFeed__\d*)/)[1],
          pageId = result.match(/\$CONFIG\['page_id'\]='(\d*)/)[1];
        task.PI = PI;
        task.pageId = pageId;
        this.getlist(task, proxy, () => {
          callback();
        });
      });
    });
  }
  getlist(task, proxy, callback) {
    const option = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        cookie: task.cookie,
        referer: `http://www.weibo.com/${task.id}`
      }
    };
    let cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        option.proxy = proxy;
        option.url = `http://weibo.com/${task.id}?pids=${task.PI}&is_search=0&visible=0&is_video=1&is_tag=0&profile_ftype=1&page=${task.page}&ajaxpagelet=1&ajaxpagelet_v6=1`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('视频列表请求错误', err.message);
            this.core.proxy.back(proxy, false);
            this.core.proxy.getProxy((error, _proxy) => {
              if (_proxy === 'timeout') {
                cycle = false;
                cb();
                return;
              }
              proxy = _proxy;
              cb();
            });
            return;
          }
          result = result.body.replace('parent.FM.view', 'jsonp').replace('<script>', '').replace('</script>', '');
          try {
            result = eval(result);
          } catch (e) {
            logger.error('列表json数据解析失败', result.html);
            this.core.proxy.back(proxy, false);
            this.core.proxy.getProxy((error, _proxy) => {
              if (_proxy === 'timeout') {
                cycle = false;
                cb();
                return;
              }
              proxy = _proxy;
              cb();
            });
            return;
          }
          const $ = cheerio.load(result.html.replace(/[\n\r\t]/)),
            div = $('div.WB_feed>div.WB_cardwrap');
          if (div.length < 15) {
            this.deal(task, div, proxy, () => {
              cycle = false;
              cb();
            });
            return;
          }
          this.deal(task, div, proxy, () => {
            if (div.length < 15) {
              cycle = false;
              cb();
              return;
            }
            this.getVidList(task, proxy, () => {
              task.page += 1;
              cb();
            });
          });
        });
      },
      () => callback()
    );
  }

  getVidList(task, Proxy, callback) {
    const option = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        cookie: task.cookie,
        referer: `http://www.weibo.com/${task.id}`
      }
    };
    let page = 0,
      _proxy = Proxy;
    async.whilst(
      () => page <= 1,
      (cb) => {
        option.url = `${this.settings.spiderAPI.weibo.newList}&page=${task.page}&pagebar=${page}&pl_name=${task.PI}&id=${task.pageId}&script_uri=/${task.id}&feed_type=0&pre_page=${task.pageId}&domain_op=100505&__rnd=${new Date().getTime()}`;
        option.proxy = _proxy;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('视频二级列表数据请求错误', err.message);
            this.core.proxy.back(_proxy, false);
            this.core.proxy.getProxy((error, proxy) => {
              if (proxy === 'timeout') {
                page = 2;
                cb();
                return;
              }
              _proxy = proxy;
              cb();
            });
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('二级视频列表json数据解析失败', result);
            this.core.proxy.back(_proxy, false);
            this.core.proxy.getProxy((error, proxy) => {
              if (proxy === 'timeout') {
                page = 2;
                cb();
                return;
              }
              _proxy = proxy;
              cb();
            });
            return;
          }
          const $ = cheerio.load(result.data.replace(/[\t\n\r]/g, '')),
            div = $('div.WB_cardwrap');
          this.core.proxy.back(_proxy, true);
          this.deal(task, div, _proxy, () => {
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

  deal(task, data, proxy, callback) {
    let index = 0;
    const length = data.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getAllInfo(task, data.eq(index), proxy, () => {
          index += 1;
          cb();
        });
      },
      () => callback()
    );
  }

  getAllInfo(task, video, proxy, callback) {
    if (video.find('div').has('.WB_feed_expand').length) {
      callback();
      return;
    }
    if (!video.find('ul.WB_media_a.WB_media_a_m1').length) {
      callback();
      return;
    }
    const dataNum = video.find('div.WB_feed_handle>div.WB_handle>ul>li'),
      v_url = video.find('.WB_from.S_txt2>a').eq(0).attr('href').match(/\/(\w*)\?/)[1],
      playNum = __playNum(video.find('ul.WB_media_a.WB_media_a_m1>li').eq(0).attr('action-data'));
    async.series(
      [
        (cb) => {
          this.getVideoInfo(video.attr('mid'), proxy, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        if (result[0] === '抛掉当前的') {
          callback();
          return;
        }
        if (!result[0].page_info.media_info) {
          callback();
          return;
        }
        let _playNum = result[0].page_info.media_info.online_users_number;
        if (playNum > 0 && (Number(_playNum) - playNum) > 10000) {
          _playNum = null;
        }
        if (!result[0].page_info.media_info.duration) {
          callback();
          return;
        }
        const media = {
          author: task.name,
          platform: task.p,
          bid: task.id,
          aid: video.attr('mid'),
          title: spiderUtils.stringHandling(trimHtml(video.find('div.WB_text.W_f14').text()).html, 80).replace(/\.\.\./g, '') || 'btwk_caihongip',
          desc: spiderUtils.stringHandling(trimHtml(video.find('div.WB_text.W_f14').text()).html, 100).replace(/\.\.\./g, '') || '',
          play_num: _playNum,
          comment_num: __num(dataNum.eq(2).find('.line.S_line1 em').eq(1).text()),
          forward_num: __num(dataNum.eq(1).find('.line.S_line1 em').eq(1).text()),
          support: __num(dataNum.eq(3).find('.line.S_line1 em').eq(1).text()),
          long_t: Math.round(result[0].page_info.media_info.duration) || '',
          v_img: result[0].page_info.page_pic,
          a_create_time: result[0].created_at,
          v_url
        };
        task.total += 1;
        if (!media.play_num) {
          delete media.play_num;
        }
        logger.debug(media);
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }

  getVideoInfo(id, proxy, callback) {
    const option = {
      url: `http://api.weibo.cn/2/guest/statuses_show?from=1067293010&c=iphone&s=6dd467f9&id=${id}`,
      ua: 3,
      own_ua: 'Weibo/5598 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    let dataTime = '',
      length = 0;
    option.proxy = proxy;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('单个视频信息请求错误', err);
        this.core.proxy.back(proxy, false);
        this.core.proxy.getProxy((error, _proxy) => {
          if (_proxy === 'timeout') {
            callback(null, '抛掉当前的');
            return;
          }
          this.getVideoInfo(id, _proxy, callback);
        });
        return;
      }
      try {
        length = result.body.length + 1;
        result = trimHtml(result.body, { preserveTags: true, limit: length });
        result = JSON.parse(result.html);
      } catch (e) {
        logger.error('单个视频信息json数据解析失败', result);
        this.core.proxy.back(proxy, false);
        this.core.proxy.getProxy((error, _proxy) => {
          if (_proxy === 'timeout') {
            callback(null, '抛掉当前的');
            return;
          }
          this.getVideoInfo(id, _proxy, callback);
        });
        return;
      }
      if (!result.page_info) {
        callback(null, '抛掉当前的');
        return;
      }
      if (!result.page_info.media_info) {
        callback(null, '抛掉当前的');
        return;
      }
      dataTime = new Date(result.created_at);
      dataTime = moment(dataTime).unix();
      result.created_at = isNaN(dataTime) ? '' : dataTime;
      this.core.proxy.back(proxy, true);
      callback(null, result);
    });
  }
}
module.exports = dealWith;