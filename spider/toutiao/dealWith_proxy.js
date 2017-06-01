/**
 * Created by junhao on 2016/12/7.
 */
const URL = require('url');
const moment = require('moment');
const async = require('async');
const crypto = require('crypto');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const getHoney = () => {
  const hash = crypto.createHash('md5');
  const t = Math.floor((new Date()).getTime() / 1e3),
    e = t.toString(16).toUpperCase(),
    n = hash.update(t.toString()).digest('hex').toUpperCase();
  if (e.length !== 8) {
    return {
      as: '479BB4B7254C150',
      cp: '7E0AC8874BB0985'
    };
  }
  let o, l, i, a, r, s;
  for (o = n.slice(0, 5), i = n.slice(-5), a = '', r = 0; r < 5; r += 1) a += o[r] + e[r];
  for (l = '', s = 0; s < 5; s += 1) l += e[s + 3] + i[s];
  return {
    as: `A1${a}${e.slice(-3)}`,
    cp: `${e.slice(0, 3) + l}E1`
  };
};
const _tag = (raw) => {
  if (!raw) {
    return '';
  }
  const _tagArr = [];
  if (raw.length !== 0) {
    for (const elem of raw.entries()) {
      _tagArr.push(elem[1]);
    }
    return _tagArr.join(',');
  }
  return '';
};
const _longT = (time) => {
  if (!time) {
    return null;
  }
  const timeArr = time.split(':');
  let longT = '';
  if (timeArr.length === 2) {
    longT = moment.duration(`00:${time}`).asSeconds();
  } else if (timeArr.length === 3) {
    longT = moment.duration(time).asSeconds();
  }
  return longT;
};
const _vImg = (video) => {
  // if (video.cover_image_infos && video.cover_image_infos.length !== 0
  //   && video.cover_image_infos[0].width && video.cover_image_infos[0].height) {
  //   return `http://p2.pstatp.com/list/${video.cover_image_infos[0].width}x${video.cover_image_infos[0].height}/${video.cover_image_infos[0].web_uri}`;
  // }
  if (video.middle_image) {
    return video.middle_image;
  }
  return null;
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
        user: (callback) => {
          this.getUser(task, (err) => {
            if (err) {
              return setTimeout(() => {
                this.getUser(task, () => callback(null, '用户信息已返回'));
              }, 1000);
            }
            callback(null, '用户信息已返回');
          });
        },
        media: (callback) => {
          this.getList(task, (err) => {
            if (err) {
              return callback(err);
            }
            callback(null, '视频信息已返回');
          });
        }
      },
      (err, result) => {
        if (err) {
          return callback(err);
        }
        logger.debug(`${task.id}_result:`, result);
        callback(null, task.total);
      }
    );
  }
  getUser(task, callback) {
    if (!task.encodeId || task.encodeId == '0') {
      this.getUserId(task);
      return callback();
    }
    const option = {
      url: this.settings.spiderAPI.toutiao.user + task.encodeId,
      ua: 3,
      own_ua: 'News/5.9.5 (iPhone; iOS 10.2; Scale/3.00)'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        return callback(err);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        return callback(e);
      }
      if (result.message != 'success' || !result.data) {
        return callback('fail');
      }
      let fans = result.data.total_cnt;
      if (Number(fans) === 0 && result.data.users.length !== 0) {
        return callback('fail');
      }
      if (typeof fans === 'string' && fans.indexOf('万') != -1) {
        fans = fans.replace('万', '') * 10000;
      }
      if (Number(fans) === 0) {
        logger.info('粉丝数发生异常：', result);
      }
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: fans
      };
      // if(task.id == '6204859881' || task.id == '4093808656' || task.id == '4161577335' || task.id == '50505877252'){
      //     this.core.fans_db.sadd(task.id, JSON.stringify({
      //         num: fans,
      //         time: new Date().getTime()
      //     }))
      // }
      this.sendUser(user, (err) => {
        callback();
      });
      this.sendStagingUser(user);
    });
  }
  sendUser(user, callback) {
    const options = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, options, (err, res) => {
      if (err) {
        return callback(err);
      }
      try {
        res = JSON.parse(res.body);
      } catch (e) {
        logger.error(`头条用户 ${user.bid} json数据解析失败`);
        logger.info(res);
        return callback(e);
      }
      if (res.errno == 0) {
        logger.debug('头条用户:', `${user.bid} back_end`);
      } else {
        logger.error('头条用户:', `${user.bid} back_error`);
        logger.info(res);
        logger.info('user info: ', user);
      }
      callback();
    });
  }
  sendStagingUser(user) {
    const options = {
      url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
      data: user
    };
    request.post(logger, options, (err, res) => {
      if (err) {
        return;
      }
      try {
        res = JSON.parse(res.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('send error:', res);
        return;
      }
      if (res.errno == 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(res);
      }
    });
  }
  getList(task, callback) {
    let index = 0, times = 0, proxyStatus = false, proxy = '',
      sign = true,
      option = {
        ua: 3,
        own_ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92 NewsArticle/5.9.5.4 JsSdk/2.0 NetType/WIFI (News 5.9.5 10.200000)'
      },
      hot_time = null;
    async.whilst(
      () => sign,
      (cb) => {
        if (index > 200) {
          sign = false;
          task.total = 50 * index;
          return cb();
        }
        const { as, cp } = getHoney();
        if (hot_time) {
          option.url = `http://ic.snssdk.com${this.settings.spiderAPI.toutiao.newList}${task.id}&cp=${cp}&as=${as}&max_behot_time=${hot_time}`;
        } else {
          option.url = `http://ic.snssdk.com${this.settings.spiderAPI.toutiao.newList}${task.id}&cp=${cp}&as=${as}&max_behot_time=`;
        }
        if (proxyStatus && proxy) {
          option.proxy = proxy;
          request.get(logger, option, (err, result) => {
            if (err) {
              times++;
              proxyStatus = false;
              this.core.proxy.back(proxy, false);
              return cb();
            }
            times = 0;
            try {
              result = JSON.parse(result.body);
            } catch (e) {
              // logger.error('json数据解析失败')
              // logger.error(result.body)
              times++;
              proxyStatus = false;
              this.core.proxy.back(proxy, false);
              return cb();
            }
            if (result.has_more === false) {
              if ((task.id == '1564257331844098' || task.id == '6357263281' || task.id == '5800750710' || task.id == '6542432526' || task.id == '6104275014' || task.id == '6976935001' || task.id == '6037403091' || task.id == '5800835780' || task.id == '51174033215') && index === 0) {
                sign = false;
                return cb();
              }
              times++;
              proxyStatus = false;
              this.core.proxy.back(proxy, true);// 原来是false
              return cb();
            }
            times = 0;
            if (!result.data || result.data.length == 0) {
              task.total = 50 * index;
              sign = false;
              return cb();
            }
            hot_time = result.next.max_behot_time;
            this.deal(task, result.data, (err) => {
              index++;
              cb();
            });
          });
        } else {
          this.core.proxy.need(times, (err, _proxy) => {
            if (err) {
              if (err == 'timeout') {
                return callback('Get proxy timesout!!');
              }
              logger.error('Get proxy occur error:', err);
              times++;
              proxyStatus = false;
              return cb();
            }
            times = 0;
            option.proxy = _proxy;
            request.get(logger, option, (err, result) => {
              if (err) {
                times++;
                proxyStatus = false;
                this.core.proxy.back(_proxy, false);
                return cb();
              }
              times = 0;
              try {
                result = JSON.parse(result.body);
              } catch (e) {
                // logger.error('json数据解析失败')
                // logger.error(result.body)
                times++;
                proxyStatus = false;
                this.core.proxy.back(_proxy, false);
                return cb();
              }
              if (result.has_more === false) {
                if ((task.id == '1564257331844098' || task.id == '6357263281' || task.id == '5800750710' || task.id == '6542432526' || task.id == '6104275014' || task.id == '6976935001' || task.id == '6037403091' || task.id == '5800835780' || task.id == '51174033215' || task.id == '52378452732') && index === 0) {
                  sign = false;
                  return cb();
                }
                times++;
                proxyStatus = false;
                this.core.proxy.back(_proxy, true);// 原来是false
                return cb();
              }
              times = 0;
              proxyStatus = true;
              proxy = _proxy;
              if (!result.data || result.data.length == 0) {
                task.total = 50 * index;
                sign = false;
                return cb();
              }
              hot_time = result.next.max_behot_time;
              this.deal(task, result.data, (err) => {
                index++;
                cb();
              });
            });
          });
        }
      },
      (err, result) => {
        this.core.proxy.back(proxy, true);
        callback();
      }
    );
  }
  deal(task, list, callback) {
    let index = 0,
      length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getInfo(task, list[index], (err) => {
          index++;
          cb();
        });
      },
      (err, result) => {
        callback();
      }
    );
  }
  getInfo(task, video, callback) {
    let media = {}, vid, query;
    if (video.str_item_id) {
      vid = video.str_item_id;
    } else if (video.app_url) {
      query = URL.parse(video.app_url, true).query;
      vid = query.item_id;
    } else {
      logger.debug(video);
      callback(video);
      return;
    }
    media.author = video.detail_source || video.source || task.name;
    media.platform = 6;
    media.bid = task.id;
    media.aid = vid;
    media.title = video.title.replace(/"/g, '') || 'btwk_caihongip';
    media.desc = video.abstract ? video.abstract.substr(0, 100).replace(/"/g, '') : '';
    media.play_num = Number(video.list_play_effective_count) + Number(video.detail_play_effective_count);
    media.comment_num = video.comment_count;
    media.support = video.digg_count || null;
    media.step = video.bury_count || null;
    media.save_num = video.repin_count || null;
    media.forward_num = video.share_count || null;
    media.a_create_time = video.publish_time;
    media.v_img = _vImg(video);
    media.long_t = _longT(video.video_duration_str);
    media.tag = _tag(video.label);
    media = spiderUtils.deleteProperty(media);
    // logger.debug('medis info: ',media)
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    spiderUtils.commentSnapshots(this.core.taskDB,
      { p: media.platform, aid: media.aid, comment_num: media.comment_num });
    callback();
  }
}
module.exports = dealWith;
