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
          this.getHot(task, () => {
            cb(null, '热门评论完成');
          });
        },
        time: (cb) => {
          this.getTime(task, () => {
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
    const proxy = '';
    let proxyStatus = false,
      times = 0;
    if (proxyStatus && proxy) {
      callback(null, proxy);
    } else {
      this.core.proxy.need(times, (err, _proxy) => {
        if (err) {
          if (err == 'timeout') {
            callback(null, 'timeout');
            return;
          }
          logger.error('Get proxy occur error:', err);
          times += 1;
          proxyStatus = false;
          this.core.proxy.back(_proxy, false);
          callback(null, false);
          return;
        }
        times = 0;
        callback(null, _proxy);
      });
    }
  }
  getHot(task, callback) {
    const total = Number(this.settings.commentTotal) % 10 === 0 ?
        Number(this.settings.commentTotal) / 10 :
        Math.ceil(Number(this.settings.commentTotal) / 10);
    let page = 1,
      option,
      proxy = '';
    this.getProxy((err, _proxy) => {
      if (_proxy === 'timeout') {
        callback();
        return;
      }
      if (!_proxy) {
        this.getHot(task, callback);
        return;
      }
      proxy = _proxy;
      async.whilst(
        () => page <= total,
        (cb) => {
          option = {
            url: `${this.settings.weibo.hot}${page}&id=${task.aid}`,
            proxy
          };
          logger.debug(option.url);
          request.get(logger, option, (error, result) => {
            if (error) {
              logger.debug('微博热门评论列表请求失败', error);
              this.core.proxy.back(proxy, false);
              this.getProxy((erro, __proxy) => {
                proxy = __proxy;
                cb();
              });
              return;
            }
            try {
              result = JSON.parse(result.body);
            } catch (e) {
              logger.debug('微博热门评论数据解析失败');
              logger.info(result.body);
              this.core.proxy.back(proxy, false);
              this.getProxy((erro, __proxy) => {
                proxy = __proxy;
                cb();
              });
              return;
            }
            result = result[0].card_group ?
              result[0].card_group :
              (result[1] ? result[1].card_group : []);
            if (!result) {
              page += 1;
              cb();
              return;
            }
            if (result.length <= 0) {
              page += total;
              cb();
              return;
            }
            this.deal(task, result, () => {
              page += 1;
              cb();
            });
          });
        },
        () => {
          callback();
        }
      );
    });
  }
  getTime(task, callback) {
    const total = Number(this.settings.commentTotal) % 20 === 0 ?
        Number(this.settings.commentTotal) / 20 :
        Math.ceil(Number(this.settings.commentTotal) / 20);
    let page = 1,
      option,
      proxy = '';
    this.getProxy((err, _proxy) => {
      if (_proxy === 'timeout') {
        this.getHot(task, callback);
        return;
      }
      if (!_proxy) {
        this.getHot(task, callback);
        return;
      }
      proxy = _proxy;
      async.whilst(
        () => page <= total,
        (cb) => {
          option = {
            url: `${this.settings.weibo.time}${page}&id=${task.aid}`,
            proxy
          };
          request.get(logger, option, (error, result) => {
            if (error) {
              logger.debug('微博最新评论列表请求失败', error);
              this.core.proxy.back(proxy, false);
              this.getProxy((erro, __proxy) => {
                proxy = __proxy;
                cb();
              });
              return;
            }
            try {
              result = JSON.parse(result.body);
            } catch (e) {
              logger.debug('微博最新评论数据解析失败');
              logger.info(result.body);
              this.core.proxy.back(proxy, false);
              this.getProxy((erro, __proxy) => {
                proxy = __proxy;
                cb();
              });
              return;
            }
            result = result[0].card_group ?
              result[0].card_group : (result[1] ? result[1].card_group : []);
            if (!result) {
              page += 1;
              cb();
              return;
            }
            if (result.length <= 0) {
              page += total;
              cb();
              return;
            }
            this.deal(task, result, () => {
              page += 1;
              cb();
            });
          });
        },
        () => {
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
        index += 1;
        cb();
      },
      () => {
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
    return '';
  }
}
module.exports = hostTime;