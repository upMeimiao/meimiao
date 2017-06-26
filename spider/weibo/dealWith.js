/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('neo-async');
const req = require('request');
const request = require('../../lib/request');
const trimHtml = require('trim-html');
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
    task.page = 1;
    this.getUserInfo(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
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
          logger.debug('用户的粉丝数请求错误', error.message);
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
        const fans = result.userInfo ? result.userInfo.followers_count : '',
          user = {
            platform: task.p,
            bid: task.id,
            fans_num: fans || ''
          };
        // logger.info(user);
        if (Number(user.fans_num) === 428472) {
          req({
            method: 'POST',
            url: 'http://10.251.55.50:3001/api/alarm',
            form: {
              mailGroup: 3,
              subject: '粉丝数据异常',
              content: JSON.stringify(result)
            }
          });
        }
        if (user.fans_num !== '') {
          this.sendUser(user);
          this.sendStagingUser(user);
        }
        if (result.tabsInfo.tabs[2].title !== '视频') {
          task.NoVideo = true;
          this.getVidTotal(task, result, proxy, (erro) => {
            if (erro) {
              callback(erro);
              return;
            }
            callback();
          });
        } else {
          task.NoVideo = false;
          this.getVidTotal(task, result, proxy, (erro) => {
            if (erro) {
              callback(erro);
              return;
            }
            callback();
          });
        }
        this.core.proxy.back(proxy, true);
      });
    });
  }

  sendUser(user) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, back) => {
      if (err) {
        logger.error('occur error : ', err.message);
        logger.info(`返回微博视频用户 ${user.bid} 连接服务器失败`);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`微博视频用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        return;
      }
      if (back.errno === 0) {
        logger.debug('微博视频用户:', `${user.bid} back_end`);
      } else {
        logger.error('微博视频用户:', `${user.bid} back_error`);
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
        const length = result.body.length;
        result = trimHtml(result.body, { preserveTags: true, limit: length });
        result = JSON.parse(result.html);
      } catch (e) {
        logger.error('总数json数据解析失败', result);
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
            callback();
            return;
          }
          this.getVidTotal(task, data, _proxy, callback);
        });
        return;
      }
      this.core.proxy.back(proxy, true);
      total = result.cardlistInfo.total;
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
        }
        option.proxy = _proxy;
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
            length = result.body.length;
            result = trimHtml(result.body, { preserveTags: true, limit: length });
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
          this.core.proxy.back(_proxy, true);
          this.deal(task, result.cards, data, _proxy, () => {
            task.page += 1;
            cb();
          });
        });
      },
      () => {
        logger.debug('没有数据了');
        callback();
      }
    );
  }

  deal(task, data, user, proxy, callback) {
    let index = 0;
    const length = data.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getAllInfo(task, data[index], user, proxy, () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }

  getAllInfo(task, video, user, proxy, callback) {
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
    async.series(
      [
        (cb) => {
          this.getVideoInfo(video.mblog.mblogid, proxy, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        if (result[0] === '抛掉当前的') {
          callback();
          return;
        } else if (!video.mblog.user) {
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
          play_num: result[0].page_info.media_info.online_users_number,
          comment_num: video.mblog.comments_count,
          forward_num: video.mblog.reposts_count,
          support: video.mblog.attitudes_count,
          long_t: result[0].page_info.media_info.duration,
          v_img: result[0].page_info.page_pic,
          a_create_time: result[0].created_at,
          v_url: video.mblog.mblogid
        };
        task.total += 1;
        if (!media.play_num) {
          delete media.play_num;
        }
        // logger.debug(media);
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
        length = result.body.length;
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