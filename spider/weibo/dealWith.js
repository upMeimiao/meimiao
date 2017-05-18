/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('async');
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
    task.page = 1;
    this.getUserInfo(task, (err) => {
      if (err) {
        return callback(err);
      }
      callback(null, task.total);
    });
  }

  getProxy(callback) {
    let proxyStatus = false,
      proxy = '',
      times = 0;
    if (proxyStatus && proxy) {
      callback(null, proxy);
    } else {
      this.core.proxy.need(times, (err, _proxy) => {
        if (err) {
          if (err == 'timeout') {
            return callback(null, 'timeout');
          }
          logger.error('Get proxy occur error:', err.message);
          times++;
          proxyStatus = false;
          this.core.proxy.back(proxy, false);
          return callback(null, false);
        }
        times = 0;
        callback(null, _proxy);
      });
    }
  }

  getUserInfo(task, callback) {
    const option = {
      url: this.settings.spiderAPI.weibo.userInfo + task.id
    };
    this.getProxy((err, proxy) => {
      if (proxy == 'timeout') {
        return callback();
      }
      if (!proxy) {
        return this.getUserInfo(task, callback);
      }
      option.proxy = proxy;
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.debug('用户的粉丝数请求错误', err.message);
          this.core.proxy.back(proxy, false);
          return this.getUserInfo(task, callback);
        }
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.error('json解析错误');
          logger.info(result);
          this.core.proxy.back(proxy, false);
          return this.getUserInfo(task, callback);
        }
        if (result.errno && result.errno === 20003) {
          spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
          return callback();
        }
        const user = {
          platform: task.p,
          bid: task.id,
          fans_num: result.userInfo ? (result.userInfo.followers_count ? result.userInfo.followers_count : '') : ''
        };
        if (user.fans_num !== '') {
          this.sendUser(user);
          this.sendStagingUser(user);
        }
        if (result.tabsInfo.tabs[2].title !== '视频') {
          task.NoVideo = true;
          this.getVidTotal(task, result, proxy, (err) => {
            if (err) {
              return callback(err);
            }
            callback();
          });
        } else {
          task.NoVideo = false;
          this.getVidTotal(task, result, proxy, (err) => {
            if (err) {
              return callback(err);
            }
            callback();
          });
        }
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
      if (back.errno == 0) {
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
      if (result.errno == 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getVidTotal(task, data, proxy, callback) {
    let containerid = '',
      option = {},
      times = 0,
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
        this.getProxy((err, proxy) => {
          if (proxy == 'timeout') {
            return callback();
          }
          this.getVidTotal(task, data, proxy, callback);
        });
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info(result);
        this.core.proxy.back(proxy, false);
        this.getProxy((err, proxy) => {
          if (proxy == 'timeout') {
            return callback();
          }
          this.getVidTotal(task, data, proxy, callback);
        });
        return;
      }
      if (result.cardlistInfo == undefined) {
        this.core.proxy.back(proxy, false);
        this.getProxy((err, proxy) => {
          if (proxy == 'timeout') {
            return callback();
          }
          this.getVidTotal(task, data, proxy, callback);
        });
        return;
      }
      total = result.cardlistInfo.total;
            // if(!total){
            //     logger.error('当前微博信息获取存在问题待解决');
            //     return callback(JSON.stringify(result))
            // }
      this.getVidList(task, data, total, proxy, () => {
        callback();
      });
    });
  }
  getVidList(task, data, total, Proxy, callback) {
    let page,
      num = 0,
      _proxy = Proxy;
    if (total % 20 != 0) {
      page = Math.ceil(total / 20);
    } else {
      page = total / 20;
    }
        // logger.debug(page)
    async.whilst(
            () => task.page <= Math.min(page, 500),
            (cb) => {
              let containerid = '',
                option = {};
              if (task.NoVideo) {
                containerid = data.tabsInfo.tabs[1].containerid;
                option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=${task.page}`;
              } else {
                containerid = data.tabsInfo.tabs[2].containerid;
                option.url = `${this.settings.spiderAPI.weibo.videoList + containerid}_time&page=${task.page}`;
              }
                // logger.debug(option.url,'+++')
              option.proxy = _proxy;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.debug('视频列表数据请求错误', err.message);
                  this.core.proxy.back(_proxy, false);
                  this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                      return callback();
                    }
                    _proxy = proxy;
                    cb();
                  });
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.error('json数据解析失败');
                  logger.info(result);
                  this.core.proxy.back(_proxy, false);
                  this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                      return callback();
                    }
                    _proxy = proxy;
                    cb();
                  });
                  return;
                }
                if (result.cards == undefined) {
                  logger.debug('当前列表页的结构有问题，重新请求');
                  this.core.proxy.back(_proxy, false);
                  this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                      return callback();
                    }
                            // this.getVidList( task, data, total, proxy, callback )
                    _proxy = proxy;
                    cb();
                  });
                  return;
                }
                if (result.cards.length <= 0) {
                  num++;
                  if (num > 1) {
                    task.page += 200;
                  }
                  return cb();
                }
                    // logger.info(task.page)
                this.deal(task, result.cards, data, _proxy, () => {
                  task.page++;
                  cb();
                });
              });
            },
            (err, result) => {
              logger.debug('没有数据了');
              callback();
            }
        );
  }
  deal(task, data, user, proxy, callback) {
    let index = 0,
      length = data.length;
    async.whilst(
            () => index < length,
            (cb) => {
                // logger.debug(data[index])
              this.getAllInfo(task, data[index], user, proxy, (err) => {
                index++;
                cb();
              });
            },
            (err, data) => {
              callback();
            }
        );
  }
  getAllInfo(task, video, user, proxy, callback) {
    if (video.mblog == undefined) {
      callback();
    } else if (video.mblog.pic_infos != undefined) {
      callback();
    } else if (video.mblog.user !== undefined && task.id != video.mblog.user.id) {
      callback();
    } else {
      async.series([
        (cb) => {
          this.getVideoInfo(video.mblog.mblogid, proxy, (err, result) => {
            this.core.proxy.back(proxy, true);
            cb(null, result);
          });
        }
      ], (err, result) => {
        if (result[0] == '抛掉当前的') {
          return callback();
        } else if (video.mblog.user == undefined) {
          return callback();
        }
        const media = {
          author: task.name,
          platform: task.p,
          bid: task.id,
          aid: video.mblog.id,
          title: video.mblog.text.substr(0, 80).replace(/"/g, ''),
          desc: video.mblog.user.description == undefined ? '' : video.mblog.user.description.substr(0, 100).replace(/"/g, ''),
          play_num: result[0].page_info.media_info.online_users_number,
          comment_num: video.mblog.comments_count,
          forward_num: video.mblog.reposts_count,
          support: video.mblog.attitudes_count,
          long_t: result[0].page_info.media_info.duration,
          v_img: result[0].page_info.page_pic,
          a_create_time: result[0].created_at,
          v_url: video.mblog.mblogid
        };
        task.total++;
        if (!media.play_num) {
          delete media.play_num;
        }
                // logger.debug(media)
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      });
    }
  }
  getVideoInfo(id, proxy, callback) {
    let option = {
        url: `http://api.weibo.cn/2/guest/statuses_show?from=1067293010&c=iphone&s=6dd467f9&id=${id}`
      },
      dataTime = '';
    option.proxy = proxy;
        // logger.debug(option.url,'---');
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('单个视频信息请求错误', err);
        this.core.proxy.back(proxy, false);
        this.getProxy((err, proxy) => {
          if (proxy == 'timeout') {
            return callback(null, '抛掉当前的');
          }
          this.getVideoInfo(id, proxy, callback);
        });
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        this.core.proxy.back(proxy, false);
        this.getProxy((err, proxy) => {
          if (proxy == 'timeout') {
            return callback(null, '抛掉当前的');
          }
          this.getVideoInfo(id, proxy, callback);
        });
        return;
      }
      if (!result.page_info) {
                // logger.debug('//////');
        return callback(null, '抛掉当前的');
      }
      if (!result.page_info.media_info) {
                // logger.debug('\\\\\\');
        return callback(null, '抛掉当前的');
      }
      dataTime = new Date(result.created_at);
      dataTime = moment(dataTime).unix();
      result.created_at = dataTime == NaN ? '' : dataTime;
      callback(null, result);
    });
  }
}
module.exports = dealWith;