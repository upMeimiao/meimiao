/**
 * Created by junhao on 2016/12/7.
 */
const URL = require('url');
const moment = require('moment');
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const crypto = require('crypto');

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
  if (video.cover_image_infos && video.cover_image_infos.length !== 0
    && video.cover_image_infos[0].width && video.cover_image_infos[0].height) {
    return `http://p2.pstatp.com/list/${video.cover_image_infos[0].width}x${video.cover_image_infos[0].height}/${video.cover_image_infos[0].web_uri}`;
  }
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
    task.uid = '';
    if (task.user_id) {
      task.uid = task.user_id;
    }
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb(null, '用户信息已返回');
          });
        },
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
            callback(null, task.total, task.uid);
          }
        }
    );
  }
  getUser(task, callback) {
    if (!task.user_id) {
      callback();
      return;
    }
    const option = {
      url: this.settings.spiderAPI.toutiao.user + task.user_id,
      ua: 3,
      own_ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92 NewsArticle/5.9.0.5 JsSdk/2.0 NetType/WIFI (News 5.9.0 10.200000)'
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
        callback('file');
        return;
      }
      let fans = result.data.total_cnt;
      if (typeof fans === 'string' && fans.indexOf('万') !== -1) {
        fans = fans.replace('万', '') * 10000;
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
    const referer = '/2/user/profile/v3/?to_html=1&refer=default&source=search&version_code=5.9.4&app_name=news_article&vid=AA078A72-B7CD-45CB-8F86-BCDB28C3D6C1&device_id=32511333712&channel=App%20Store&resolution=1242*2208&aid=13&ab_version=95360,100770,100734,101516,101786,101539,101479,101533,100846,101117,101778,97142,90764,101586,101558,92439,101294,100404,100755,100786,101710,98040,100825,101405,101308,101797,100948&ab_feature=z2&ab_group=z2&openudid=2142f5f6a7d2e38576de8383f79ba12ebc56e1b8&live_sdk_version=1.3.0&idfv=AA078A72-B7CD-45CB-8F86-BCDB28C3D6C1&ac=WIFI&os_version=10.2&ssmix=a&device_platform=iphone&iid=7241944320&ab_client=a1,f2,f7,e1&device_type=iPhone%206S%20Plus&idfa=00000000-0000-0000-0000-000000000000';
    let index = 0, times = 0,
      sign = true,
      hotTime = '',
      protocolNum;
    const option = {
        headers: {
          accept: 'application/json',
          'x-requested-with': 'XMLHttpRequest',
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92 NewsArticle/5.9.4.1 JsSdk/2.0 NetType/WIFI (News 5.9.4 10.200000)'
        }
      },
      protocol = ['http://lf.snssdk.com', 'http://ic.snssdk.com', 'https://lf.snssdk.com', 'https://ic.snssdk.com'];
    async.whilst(
      () => sign,
      (cb) => {
        if (index > 200) {
          sign = false;
          cb();
          return;
        }
        const { as, cp } = getHoney();
        times += 1;
        protocolNum = Math.floor(Math.random() * 4);
        option.url = `${protocol[protocolNum] + this.settings.spiderAPI.toutiao.newList + task.id}&cp=${cp}&as=${as}&max_behot_time=${hotTime}`;
        option.headers.referer = `${protocol[protocolNum] + referer}&media_id=${task.id}`;
        this.getListInfo(option, (err, result) => {
          if (err) {
            if (times > 10) {
              task.total = 50 * index;
              sign = false;
              if (index === 0) {
                cb('failed');
              } else {
                cb();
              }
              return;
            }
            setTimeout(() => {
              cb();
            }, 5000 * times);
            return;
          }
          times = 0;
          if (index === 0 && result.data.length > 0) {
            task.uid = result.data[0].creator_uid;
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
      },
      (err) => {
        if (err) {
          callback(err);
        } else {
          callback();
        }
      }
    );
  }
  getListInfo(option, callback) {
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.error(result.body);
        callback(e);
        return;
      }
      if (result.has_more === false) {
        logger.error(result);
        callback('has_more_error');
        return;
      }
      callback(null, result);
    });
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
        setTimeout(() => {
          callback();
        }, 5000);
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
    spiderUtils.saveCache(this.core.cache_db, 'cache', media);
    callback();
  }
}

module.exports = dealWith;