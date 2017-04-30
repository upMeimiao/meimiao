/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const moment = require('moment');

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
        // logger.debug(this.creatTime('今天 07:10'))
        // return
    async.parallel(
      {
        hot: (cb) => {
          this.getHot(task, (err) => {
            cb(null, '热门评论完成');
          });
        },
        time: (cb) => {
          this.getTime(task, (err) => {
            cb(null, '最新评论完成');
          });
        }
      },
            (err, result) => {
              logger.debug('result: ', result);
              callback();
            }
        );
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
          logger.error('Get proxy occur error:', err);
          times++;
          proxyStatus = false;
          this.core.proxy.back(_proxy, false);
          return callback(null, false);
        }
        times = 0;
        callback(null, _proxy);
      });
    }
  }
  getHot(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 10 == 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
      option,
      proxy = '';
    this.getProxy((err, _proxy) => {
      if (_proxy == 'timeout') {
        return callback('timeout ~');
      }
      if (!_proxy) {
        return this.getHot(task, callback);
      }
      proxy = _proxy;
      async.whilst(
                () => page <= total,
                (cb) => {
                  option = {
                    url: `${this.settings.weibo.hot}${page}&id=${task.aid}`,
                    proxy
                  };
                  request.get(logger, option, (err, result) => {
                    if (err) {
                      logger.debug('微博热门评论列表请求失败', err);
                      this.core.proxy.back(proxy, false);
                      return this.getProxy((err, _proxy) => {
                        if (proxy == 'timeout') {
                          return callback('timeout ~');
                        }
                        proxy = _proxy;
                        cb();
                      });
                    }
                    try {
                      result = JSON.parse(result.body);
                    } catch (e) {
                      logger.debug('微博热门评论数据解析失败');
                      logger.info(result.body);
                      this.core.proxy.back(proxy, false);
                      return this.getProxy((err, _proxy) => {
                        if (proxy == 'timeout') {
                          return callback('timeout ~');
                        }
                        proxy = _proxy;
                        cb();
                      });
                    }
                    result = result[0].card_group ? result[0].card_group : (result[1] ? result[1].card_group : []);
                    if (result.length <= 0) {
                      page += total;
                      return cb();
                    }
                    this.deal(task, result, (err) => {
                      page++;
                      cb();
                    });
                  });
                },
                (err, result) => {
                  callback();
                }
            );
    });
  }
  getTime(task, callback) {
    let page = 1,
      total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
      option,
      proxy = '';
    this.getProxy((err, _proxy) => {
      if (_proxy == 'timeout') {
        return callback('timeout ~');
      }
      if (!_proxy) {
        return this.getHot(task, callback);
      }
      proxy = _proxy;
      async.whilst(
                () => page <= total,
                (cb) => {
                  option = {
                    url: `${this.settings.weibo.time}${page}&id=${task.aid}`,
                    proxy
                  };
                  request.get(logger, option, (err, result) => {
                    if (err) {
                      logger.debug('微博最新评论列表请求失败', err);
                      this.core.proxy.back(proxy, false);
                      return this.getProxy((err, _proxy) => {
                        if (proxy == 'timeout') {
                          return callback('timeout ~');
                        }
                        proxy = _proxy;
                        cb();
                      });
                    }
                    try {
                      result = JSON.parse(result.body);
                    } catch (e) {
                      logger.debug('微博最新评论数据解析失败');
                      logger.info(result.body);
                      this.core.proxy.back(proxy, false);
                      return this.getProxy((err, _proxy) => {
                        if (proxy == 'timeout') {
                          return callback('timeout ~');
                        }
                        proxy = _proxy;
                        cb();
                      });
                    }
                    result = result[0].card_group ? result[0].card_group : (result[1] ? result[1].card_group : []);
                    if (result.length <= 0) {
                      page += total;
                      return cb();
                    }
                    this.deal(task, result, (err) => {
                      page++;
                      cb();
                    });
                  });
                },
                (err, result) => {
                  callback();
                }
            );
    });
  }
  deal(task, comments, callback) {
    let length = comments.length,
      index = 0,
      time,
      comment;
    async.whilst(
            () => index < length,
            (cb) => {
              time = this.creatTime(comments[index].created_at);
              comment = {
                cid: comments[index].id,
                content: Utils.stringHandling(comments[index].text),
                platform: task.p,
                bid: task.bid,
                aid: task.aid,
                ctime: time,
                support: comments[index].like_counts,
                step: '',
                reply: '',
                c_user: {
                  uid: comments[index].user.id,
                  uname: comments[index].user.screen_name,
                  uavatar: comments[index].user.profile_image_url
                }
              };
              Utils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
              index++;
              cb();
            },
            (err, result) => {
              callback();
            }
        );
  }
  creatTime(time) {
    let newTime;
    if (!time) {
      return '';
    }
    if (time.includes('刚刚')) {
      return moment().unix();
    }
    if (time.includes('秒')) {
      time = time.replace('秒', '');
      time = Number(moment().unix()) - Number(time);
      return time;
    }
    if (time.includes('分钟')) {
      time = time.replace('分钟前', '');
      time = Number(moment().unix()) - (Number(time) * 60);
      return time;
    }
    if (time.includes('今天')) {
      time = time.replace('今天', '');
      newTime = moment.unix(moment().unix()).toDate().toJSON().toString().substr(0, 10);
      time = `${newTime + time}:00`;
      time = new Date(time);
      return moment(time).format('X');
    }
    if (time.includes('昨天')) {
      time = time.replace('昨天', '');
      newTime = (Number(moment().unix()) - (24 * 60 * 60));
      newTime = moment.unix(newTime).toDate().toJSON().toString().substr(0, 10);
      time = `${newTime + time}:00`;
      time = new Date(time);
      return moment(time).format('X');
    }
  }
}
module.exports = hostTime;