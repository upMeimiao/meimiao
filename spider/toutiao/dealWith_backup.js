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
        // user: (cb) => {
        //   this.getUser(task, (err) => {
        //     if (err) {
        //       setTimeout(() => {
        //         this.getUser(task, () => callback(null, '用户信息已返回'));
        //       }, 1000);
        //       return;
        //     }
        //     cb(null, '用户信息已返回');
        //   });
        // },
        media: (cb) => {
          this.getList(task, (err) => {
            if (err) {
              cb(err);
            } else {
              cb(null, '视频信息已返回');
            }
          });
        }
      },
        (err, result) => {
          if (err) {
            callback(err);
          } else {
            logger.debug(`${task.id}_result:`, result);
            callback(null, task.total);
          }
        }
    );
  }
  getUser(task, callback) {
    if (!task.encodeId || task.encodeId === '0') {
      this.getUserId(task);
      callback();
      return;
    }
    const option = {
      url: this.settings.spiderAPI.toutiao.user + task.encodeId,
      ua: 3,
      own_ua: 'News/5.9.5 (iPhone; iOS 10.2; Scale/3.00)'
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
        callback('failed');
        return;
      }
      let fans = result.data.total_cnt;
      if (Number(fans) === 0 && result.data.users.length !== 0) {
        callback('failed');
        return;
      }
      if (typeof fans === 'string' && fans.indexOf('万') !== -1) {
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
  getUserId(task) {
    request.get(logger, { url: `http://lf.snssdk.com/2/user/profile/v3/?media_id=${task.id}` }, (err, result) => {
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
      if (result.message !== 'success') {
        return;
      }
      const userId = result.data.user_id;
      this.sendUid(task, userId);
    });
  }
  sendUid(task, uid) {
    const option = {
      url: 'http://www.meimiaoip.com/index.php/Spider/Incould/update',
      data: {
        platform: 6,
        bid: task.id,
        encodeId: uid,
      }
    };
    request.post(logger, option, (err, body) => {
      if (err) {
        return;
      }
      logger.debug(body.body);
    });
  }
  getList(task, callback) {
    let index = 0, proxyStatus = false, proxy = '',
      sign = true,
      hotTime = null;
    const option = {
      ua: 3,
      own_ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92 NewsArticle/5.9.5.4 JsSdk/2.0 NetType/WIFI (News 5.9.5 10.200000)'
    };
    const self = this;
    async function getProxy() {
      const proxyData = await self.core.proxy.need(5);
      return proxyData;
    }
    async.whilst(
      () => sign && index < 200,
      (cb) => {
        const { as, cp } = getHoney();
        if (hotTime) {
          option.url = `http://ic.snssdk.com${this.settings.spiderAPI.toutiao.newList}${task.id}&cp=${cp}&as=${as}&max_behot_time=${hotTime}`;
        } else {
          option.url = `http://ic.snssdk.com${this.settings.spiderAPI.toutiao.newList}${task.id}&cp=${cp}&as=${as}&max_behot_time=`;
        }
        if (proxyStatus && proxy) {
          option.proxy = proxy;
          request.get(logger, option, (err, result) => {
            if (err) {
              proxyStatus = false;
              this.core.proxy.back(proxy, false);
              cb();
              return;
            }
            try {
              result = JSON.parse(result.body);
            } catch (e) {
              logger.error('json数据解析失败');
              // logger.error(result.body);
              proxyStatus = false;
              this.core.proxy.back(proxy, false);
              cb();
              return;
            }
            if (result.has_more === false) {
              if ((task.id === '5800750710' || task.id === '5800835780' || task.id === '51174033215') && index === 0) {
                sign = false;
                cb();
                return;
              }
              proxyStatus = false;
              this.core.proxy.back(proxy, true);// 原来是false
              cb();
              return;
            }
            if (!result.data || result.data.length === 0) {
              task.total = 50 * index;
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
          getProxy()
            .then((_proxy) => {
              option.proxy = _proxy;
              request.get(logger, option, (err, result) => {
                if (err) {
                  proxyStatus = false;
                  this.core.proxy.back(_proxy, false);
                  cb();
                  return;
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.error('json数据解析失败');
                  // logger.error(result.body);
                  proxyStatus = false;
                  this.core.proxy.back(_proxy, false);
                  cb();
                  return;
                }
                if (result.has_more === false) {
                  if ((task.id === '5800750710' || task.id === '5800835780' || task.id === '51174033215' || task.id === '52378452732') && index === 0) {
                    sign = false;
                    cb();
                    return;
                  }
                  proxyStatus = false;
                  this.core.proxy.back(_proxy, true);// 原来是false
                  cb();
                  return;
                }
                proxyStatus = true;
                proxy = _proxy;
                if (!result.data || result.data.length === 0) {
                  task.total = 50 * index;
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
            })
            .catch(() => {
              proxyStatus = false;
              cb();
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
    let media = {}, vid;
    if (video.str_item_id) {
      vid = video.str_item_id;
    } else if (video.app_url) {
      const query = URL.parse(video.app_url, true).query;
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
    media.play_num = Number(video.list_play_effective_count)
      + Number(video.detail_play_effective_count);
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
    // logger.debug('medis info: ', media);
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    callback();
  }
  // getPlayNum(vid, callback) {
  //   const option = {
  //     url: `http://m.toutiao.com/i${vid}/info/`,
  //   };
  //   request.get(logger, option, (err, result) => {
  //     if (err) {
  //       callback(err);
  //       return;
  //     }
  //     try {
  //       result = JSON.parse(result.body);
  //     } catch (e) {
  //       logger.error('返回JSON格式不正确');
  //       logger.error('info:', result);
  //       callback(e);
  //       return;
  //     }
  //     const backData = result.data;
  //     if (!backData) {
  //       callback(true);
  //       return;
  //     }
  //     callback(null, backData.video_play_count);
  //   });
  // }
}
module.exports = dealWith;