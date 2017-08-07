/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('neo-async');
const request = require('../../lib/request');
const trimHtml = require('trim-html');
const spiderUtils = require('../../lib/spiderUtils');

const _cookie = () => {
  const time = new Date().getTime(),
    str = '36822K7dcPxrAZUn_wUyWPkaY1H-jydDgtNAn7uJhMyAxh87lsCabckHQtcyq-4VhvteW82bogQ3mL9Z',
    length = str.length;
  let sub = '';
  for (let i = 0; i < length; i += 1) {
    sub += str.charAt(Math.floor(Math.random() * length));
  }
  return `SINAGLOBAL=9973892314779.559.${time - 117817}; _s_tentry=www.baidu.com; Apache=2296727999173.48.${time}; ULV=${time + 4}:2:2:2:2296727999173.48.${time}:${time - 117775}; SUB=_2A${sub}g..; UOR=,,login.sina.com.cn;`;
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
    task.page = 1;
    task.proxy = null;
    task.cookie = _cookie();
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
      () => {
        this.core.proxy.back(task.proxy, true);
        callback(null, task.total);
      }
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
      url: this.settings.spiderAPI.weibo.userInfo + task.id,
      ua: 3,
      own_ua: 'Weibo/5598 CFNetwork/811.5.4 Darwin/16.6.0'
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
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.error('用户json解析错误', result.body);
          this.core.proxy.back(proxy, false);
          this.getUserInfo(task, callback);
          return;
        }
        if (result.errno && result.errno === 20003) {
          spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
          callback();
          return;
        }
        if (!result.tabsInfo.tabs) {
          this.getUserInfo(task, callback);
          return;
        }
        task.NoVideo = true;
        task.proxy = proxy;
        this.getVidTotal(task, result, proxy, (erro) => {
          if (erro) {
            callback(erro);
            return;
          }
          callback();
        });
      });
    });
  }
  getVidTotal(task, data, proxy, callback) {
    const option = {
      ua: 3,
      own_ua: 'Weibo/5598 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    let containerid = '',
      total = 0;
    if (task.NoVideo) {
      containerid = data.tabsInfo.tabs[1].containerid;
      option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=0`;
    } else {
      containerid = data.tabsInfo.tabs[2].containerid;
      option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_time&page=0`;
      if (!data.tabsInfo.tabs[2].filter_group_info) {
        option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}&page=0`;
      }
    }
    option.proxy = proxy;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频总量请求错误', err.message);
        this.core.proxy.back(proxy, false);
        this.core.proxy.getProxy((error, _proxy) => {
          if (_proxy === 'timeout') {
            callback();
            return;
          }
          this.getVidTotal(task, data, _proxy, callback);
        });
        return;
      }
      try {
        const length = result.body.length + 1;
        result = trimHtml(result.body, { preserveTags: false, limit: length });
        result = JSON.parse(result.html);
      } catch (e) {
        logger.error('总数json数据解析失败', result.html);
        this.core.proxy.back(proxy, false);
        this.core.proxy.getProxy((error, _proxy) => {
          if (_proxy === 'timeout') {
            callback();
            return;
          }
          this.getVidTotal(task, data, _proxy, callback);
        });
        return;
      }
      if (!result.cardlistInfo) {
        this.core.proxy.back(proxy, false);
        this.core.proxy.getProxy((error, _proxy) => {
          if (_proxy === 'timeout') {
            console.log('123');
            callback();
            return;
          }
          this.getVidTotal(task, data, _proxy, callback);
        });
        return;
      }
      total = result.cardlistInfo.total;
      task.proxy = proxy;
      this.getVidList(task, data, total, proxy, () => {
        callback();
      });
    });
  }

  getVidList(task, data, total, Proxy, callback) {
    const option = {
      ua: 3,
      own_ua: 'Weibo/5598 CFNetwork/811.5.4 Darwin/16.6.0'
    };
    let page,
      num = 0,
      _proxy = Proxy,
      containerid = '',
      length = 0;
    if (total % 20 !== 0) {
      page = Math.ceil(total / 20);
    } else {
      page = total / 20;
    }
    async.whilst(
      () => task.page <= Math.min(page, 500),
      (cb) => {
        if (task.NoVideo) {
          containerid = data.tabsInfo.tabs[1].containerid;
          option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=${task.page}`;
        } else {
          containerid = data.tabsInfo.tabs[2].containerid;
          option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_time&page=${task.page}`;
          if (!data.tabsInfo.tabs[2].filter_group_info) {
            option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}&page=${task.page}`;
          }
        }
        option.proxy = _proxy;
        logger.debug(option.url);
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('视频列表数据请求错误', err.message);
            this.core.proxy.back(_proxy, false);
            this.core.proxy.getProxy((error, proxy) => {
              if (proxy === 'timeout') {
                page = -1;
                cb();
                return;
              }
              _proxy = proxy;
              cb();
            });
            return;
          }
          try {
            length = result.body.length + 1;
            result = trimHtml(result.body, { preserveTags: false, limit: length });
            result = JSON.parse(result.html);
          } catch (e) {
            logger.error('视频列表json数据解析失败', result);
            this.core.proxy.back(_proxy, false);
            this.core.proxy.getProxy((error, proxy) => {
              if (proxy === 'timeout') {
                page = -1;
                cb();
                return;
              }
              _proxy = proxy;
              cb();
            });
            return;
          }
          if (!result.cards) {
            logger.debug('当前列表页的结构有问题，重新请求');
            this.core.proxy.back(_proxy, false);
            this.core.proxy.getProxy((error, proxy) => {
              if (proxy === 'timeout') {
                page = -1;
                cb();
                return;
              }
              _proxy = proxy;
              cb();
            });
            return;
          }
          if (result.cards.length <= 0) {
            num += 1;
            if (num > 1) {
              page = -1;
            }
            cb();
            return;
          }
          task.proxy = _proxy;
          this.deal(task, result.cards, _proxy, () => {
            task.page += 1;
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
        this.getAllInfo(task, data[index], proxy, () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }

  getAllInfo(task, video, proxy, callback) {
    if (!video.mblog) {
      callback();
      return;
    }
    if (video.mblog.pic_infos) {
      callback();
      return;
    }
    if (video.mblog.user && task.id != video.mblog.user.id) {
      callback();
      return;
    }
    if (!video.mblog.source || video.mblog.source.includes('一直播')) {
      callback();
      return;
    }
    async.series(
      [
        (cb) => {
          this.getVideoInfo(task, video.mblog.mblogid, proxy, (err, result) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, result);
          });
        },
        (cb) => {
          this.playNum(task, video.mblog.mblogid, proxy, (err, result) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        if (err) {
          callback();
          return;
        }
        if (!video.mblog.user) {
          callback();
          return;
        }
        if (!result[0].page_info.media_info.duration) {
          callback();
          return;
        }
        const _playNum = Number(result[0].page_info.media_info.online_users_number);
        if (_playNum - result[1] > 10000) {
          callback();
          return;
        }
        const media = {
          author: task.name,
          platform: task.p,
          bid: task.id,
          aid: video.mblog.id,
          title: video.mblog.text.substr(0, 80).replace(/"/g, ''),
          desc: !video.mblog.user.description ? '' : video.mblog.user.description.substr(0, 100).replace(/"/g, ''),
          play_num: _playNum,
          comment_num: video.mblog.comments_count,
          forward_num: video.mblog.reposts_count,
          support: video.mblog.attitudes_count,
          long_t: Math.round(result[0].page_info.media_info.duration) || '',
          v_img: result[0].page_info.page_pic,
          a_create_time: result[0].created_at,
          v_url: video.mblog.mblogid
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

  getVideoInfo(task, id, proxy, callback) {
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
            callback('error');
            return;
          }
          this.getVideoInfo(task, id, _proxy, callback);
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
            callback('error');
            return;
          }
          this.getVideoInfo(task, id, _proxy, callback);
        });
        return;
      }
      if (!result.page_info) {
        callback('抛掉当前的');
        return;
      }
      if (!result.page_info.media_info) {
        callback('抛掉当前的');
        return;
      }
      dataTime = new Date(result.created_at);
      dataTime = moment(dataTime).unix();
      result.created_at = isNaN(dataTime) ? '' : dataTime;
      task.proxy = proxy;
      callback(null, result);
    });
  }
  playNum(task, id, proxy, callback) {
    const option = {
      url: `http://weibo.com/${task.id}/${id}?mod=weibotime&type=comment`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        referer: 'http://weibo.com/',
        cookie: task.cookie
      }
    };
    option.proxy = proxy;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('播放页请求失败', err);
        this.core.proxy.back(proxy, false);
        this.core.proxy.getProxy((error, _proxy) => {
          if (_proxy === 'timeout') {
            callback('error');
            return;
          }
          this.playNum(task, id, _proxy, callback);
        });
        return;
      }
      const start = result.body.indexOf('&play_count='),
        end = result.body.indexOf('&duration=');
      let play = '';
      if (start === -1 || end === -1) {
        console.log(start, '/-*/-*/*/-/++++/+', end);
        logger.debug(option.url);
        callback('error');
        return;
      }
      play = result.body.substring(start + 12, end);
      if (!play) {
        callback(null, 0);
        return;
      }
      if (play.includes('万')) {
        play = play.match(/(\d*)万/)[1];
        play = `${play}0000`;
        if (isNaN(play)) {
          callback(null, 0);
          return;
        }
        callback(null, Number(play));
        return;
      }
      if (isNaN(play)) {
        callback(null, 0);
        return;
      }
      callback(null, Number(play));
    });
  }
}
module.exports = dealWith;