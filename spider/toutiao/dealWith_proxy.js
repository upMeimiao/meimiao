/**
 * Created by junhao on 2016/12/7.
 */
const URL = require('url');
const moment = require('moment');
const async = require('neo-async');
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
        user: (cb) => {
          this.getUser(task, (err) => {
            if (err) {
              setTimeout(() => {
                this.getUser(task, () => cb(null, '用户信息已返回'));
              }, 1000);
              return;
            }
            cb(null, '用户信息已返回');
          });
        },
        media: (cb) => {
          this.getList(task, (err) => {
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
  getUser(task, callback) {
    if (!task.encodeId || task.encodeId === '0') {
      callback();
      return;
    }
    const option = {
      url: this.settings.spiderAPI.toutiao.user + task.encodeId,
      ua: 3,
      own_ua: 'News 6.1.6 rv:6.1.6.7 (iPhone; iOS 10.3.3; zh_CN) Cronet'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        callback(e);
        return;
      }
      if (result.message !== 'success' || !result.data) {
        callback('fail');
        return;
      }
      const fans = result.data.followers_count;
      // if (Number(fans) === 0 && result.data.users.length !== 0) {
      //   callback('fail');
      //   return;
      // }
      // if (typeof fans === 'string' && fans.indexOf('万') !== -1) {
      //   fans = fans.replace('万', '') * 10000;
      // }
      if (Number(fans) === 0) {
        logger.info('粉丝数发生异常：', result);
      }
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: fans
      };
      this.sendUser(user, () => {
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
        callback(err);
        return;
      }
      try {
        res = JSON.parse(res.body);
      } catch (e) {
        logger.error(`头条用户 ${user.bid} json数据解析失败`);
        logger.info(res);
        callback(e);
        return;
      }
      if (Number(res.errno) === 0) {
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
      if (Number(res.errno) === 0) {
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
      hotTime = null,
      bid = task.mapBid;
    const option = {
      headers: {
        accept: 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_3 like Mac OS X) AppleWebKit/603.3.8 (KHTML, like Gecko) Mobile/14G60 NewsArticle/6.2.6.5 JsSdk/2.0 NetType/WIFI (News 6.2.6 10.300000)'
      }
    };
    async.whilst(
      () => sign,
      (cb) => {
        if (index >= 400) {
          sign = false;
          task.total = 20 * index;
          cb();
          return;
        }
        const { as, cp } = getHoney();
        if (hotTime) {
          option.url = `http://ic.snssdk.com${this.settings.spiderAPI.toutiao.newList}${bid}&uid=${task.encodeId}&cp=${cp}&as=${as}&from=user_profile_app&max_behot_time=${hotTime}`;
        } else {
          option.url = `http://ic.snssdk.com${this.settings.spiderAPI.toutiao.newList}${bid}&uid=${task.encodeId}&cp=${cp}&as=${as}&from=user_profile_app&max_behot_time=`;
        }
        logger.debug(option.url);
        if (proxyStatus && proxy) {
          option.proxy = proxy;
          request.get(logger, option, (error, result) => {
            if (error) {
              logger.error(error)
              proxyStatus = false;
              this.core.proxy.back(proxy, false);
              cb();
              return;
            }
            try {
              result = JSON.parse(result.body);
            } catch (e) {
              // logger.error('json数据解析失败')
              // logger.error(result.body)
              proxyStatus = false;
              this.core.proxy.back(proxy, false);
              cb();
              return;
            }
            if (result.has_more === false) {
              if (this.core.banned.includes(task.id) && index === 0) {
              // if ((task.id === '1565649022089218' || task.id === '1562801004838914' || task.id === '50471172620' || task.id === '6044722367' || task.id === '1564010034962434' || task.id === '1570072688988162' || task.id === '1573581954212878' || task.id === '1566789731554306' || task.id === '1571336929415170' || task.id === '1569456576470017' || task.id === '5836890714' || task.id === '51090620837' || task.id === '51919907973' || task.id === '6104624179' || task.id === '3785249520' || task.id === '52378452732' || task.id === '52673486454' || task.id === '1564257331844098' || task.id === '6357263281' || task.id === '6276458172' || task.id === '6542432526' || task.id === '6104275014' || task.id === '6976935001' || task.id === '6037403091' || task.id === '51174033215') && index === 0) {
                sign = false;
                cb();
                return;
              }
              proxyStatus = false;
              this.core.proxy.back(proxy, false);// 原来是false
              cb();
              return;
            }
            if (Number(result.has_more) === 0 && result.data.length === 0 && bid !== task.encodeId) {
              bid = task.encodeId;
              cb();
              return;
            }
            if (!result.data || result.data.length === 0) {
              task.total = 20 * index;
              sign = false;
              cb();
              return;
            }
            hotTime = result.next.max_behot_time;
            this.deal(task, result.data, () => {
              index += 1;
              cb();
            });
          });
        } else {
          this.core.proxy.need(times, (error, _proxy) => {
            if (error) {
              if (error === 'timeout!') {
                callback('Get proxy timesout!!');
                return;
              }
              logger.error('Get proxy occur error:', error);
              proxyStatus = false;
              cb();
              return;
            }
            option.proxy = _proxy;
            request.get(logger, option, (err, result) => {
              if (err) {
                logger.error(err)
                proxyStatus = false;
                this.core.proxy.back(_proxy, false);
                cb();
                return;
              }
              try {
                result = JSON.parse(result.body);
              } catch (e) {
                // logger.error('json数据解析失败')
                // logger.error(result.body)
                proxyStatus = false;
                this.core.proxy.back(_proxy, false);
                cb();
                return;
              }
              if (result.has_more === false) {
                if (this.core.banned.includes(task.id) && index === 0) {
                // if ((task.id === '1565649022089218' || task.id === '1562801004838914' || task.id === '50471172620' || task.id === '6044722367' || task.id === '1564010034962434' || task.id === '1570072688988162' || task.id === '1573581954212878' || task.id === '1566789731554306' || task.id === '1571336929415170' || task.id === '1569456576470017' || task.id === '5836890714' || task.id === '51090620837' || task.id === '51919907973' || task.id === '6104624179' || task.id === '3785249520' || task.id === '52378452732' || task.id === '52673486454' || task.id === '1564257331844098' || task.id === '6357263281' || task.id === '6276458172' || task.id === '6542432526' || task.id === '6104275014' || task.id === '6976935001' || task.id === '6037403091' || task.id === '51174033215') && index === 0) {
                  sign = false;
                  cb();
                  return;
                }
                proxyStatus = false;
                this.core.proxy.back(_proxy, false);// 原来是false
                cb();
                return;
              }
              proxyStatus = true;
              proxy = _proxy;
              if (Number(result.has_more) === 0 && result.data.length === 0 && bid !== task.encodeId) {
                bid = task.encodeId;
                cb();
                return;
              }
              if (!result.data || result.data.length === 0) {
                task.total = 20 * index;
                sign = false;
                cb();
                return;
              }
              hotTime = result.next.max_behot_time;
              this.deal(task, result.data, () => {
                index += 1;
                cb();
              });
            });
          });
        }
      },
      () => {
        this.core.proxy.back(proxy, true);
        callback();
      }
    );
  }
  deal(task, list, callback) {
    let index = 0;
    const length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getInfo(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
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
