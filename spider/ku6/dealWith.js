/**
 * Created by yunsong on 16/7/28.
 */
const async = require('neo-async');
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
    async.parallel({
      user: (cb) => {
        this.getUser(task, task.id, (err) => {
          if (err) {
            cb(err);
            return;
          }
          cb(null, '用户信息已返回');
        });
      },
      media: (cb) => {
        this.getTotal(task, task.id, (err) => {
          if (err) {
            cb(err);
            return;
          }
          cb(null, '视频信息已返回');
        });
      },
      // program: (cb) => {
      //   this.core.getProgram.start(task, (err) => {
      //     if (err) {
      //       cb(err);
      //       return;
      //     }
      //     cb(null, '栏目信息已返回');
      //   });
      // }
    }, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      logger.debug('result : ', result);
      callback(null, task.total);
    });
  }
  getUser(task, id, callback) {
    const option = {
      url: this.settings.spiderAPI.ku6.fansNum + id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('粉丝数请求失败');
        callback(e);
        return;
      }
      if (!result.data) {
        callback();
        return;
      }
      const fans = result.data.subscriptions ? result.data.subscriptions : '',
        user = {
          platform: 14,
          bid: task.id,
          fans_num: spiderUtils.numberHandling(fans)
        };
      this.sendUser(user, () => callback());
      this.sendStagingUser(user);
    });
  }
  sendUser(user, callback) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('send error:', result);
        callback(e);
        return;
      }
      if (result.errno === 0) {
        logger.debug('酷6用户:', `${user.bid} back_end`);
      } else {
        logger.error('酷6用户:', `${user.bid} back_error`);
        logger.info(result);
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
  getTotal(task, id, callback) {
    logger.debug('开始获取视频总数');
    const option = {
      url: this.settings.spiderAPI.ku6.listNum + id,
      referer: `http://v.ku6.com/u/${task.id}/profile.html`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('json1 error :', result.body);
        callback(e);
        return;
      }
      const total = result.data.videoCount;
      task.total = total;
      this.getList(task, total, (error) => {
        if (error) {
          callback(error);
          return;
        }
        callback(null, '视频信息已返回');
      });
    });
  }
  getList(task, total, callback) {
    let sign = 1,
      newSign = 0,
      page,
      option,
      list;
    if (total % 20 === 0) {
      page = total / 20;
    } else {
      page = Math.ceil(total / 20);
    }
    async.whilst(
      () => sign <= Math.min(page, 500),
      (cb) => {
        logger.debug(`开始获取第${sign}页视频列表`);
        option = {
          url: `${this.settings.spiderAPI.ku6.allInfo + task.id}&pn=${newSign}`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info('json error: ', result.body);
            sign += 1;
            newSign += 1;
            cb();
            return;
          }
          list = result.data;
          if (list) {
            this.deal(task, list, () => {
              sign += 1;
              newSign += 1;
              cb();
            });
          } else {
            sign += 1;
            newSign += 1;
            cb();
          }
        });
      },
      () => callback()
    );
  }
  deal(task, list, callback) {
    let index = 0;
    async.whilst(
      () => index < list.length,
      (cb) => {
        this.getInfo(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => callback()
    );
  }
  getInfo(task, data, callback) {
    async.waterfall(
      [
        (cb) => {
          this.getComment(data, (err, num) => {
            cb(null, num);
          });
        }
      ],
      (err, result) => {
        const time = data.uploadtime,
          a_create_time = time.substring(0, 10),
          media = {
            author: data.nick,
            platform: 14,
            bid: task.id,
            aid: data.vid,
            title: data.title ? data.title.substr(0, 100).replace(/"/g, '') : 'btwk_caihongip',
            desc: data.desc.substr(0, 100).replace(/"/g, ''),
            play_num: data.viewed,
            support: data.liked,
            step: data.disliked,
            a_create_time,
            long_t: data.videotime,
            v_img: this._v_img(data.picpath),
            tag: this._tag(data.tag),
            class: this._class(data.catename),
            comment_num: result
          };
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        // logger.info(media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getComment(video, callback) {
    const option = {
      url: `${this.settings.spiderAPI.ku6.comment + video.vid}&pn=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('ku6评论总量请求失败', err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('ku6评论数据解析失败', result.body);
        callback(null, '');
        return;
      }
      if (Number(result.status) === 300) {
        callback(null, '');
        return;
      }
      if (!result.data) {
        callback(null, '');
        return;
      }
      callback(null, result.data.count);
    });
  }
  _tag(raw) {
    if (!raw) {
      return '';
    }
    raw = raw.split(' ');
    const _tagArr = [];
    if (raw.length != 0) {
      for (const i in raw) {
        _tagArr.push(raw[i]);
      }
      return _tagArr.join(',');
    }
    return '';
  }
  _class(raw) {
    if (typeof raw === 'string') {
      return raw;
    }
    if (Object.prototype.toString.call(raw) === '[object Array]') {
      return raw.join(',');
    }
    return '';
  }
  _v_img(raw) {
    if (!raw) {
      return '';
    }
    if (!raw.startsWith('http://') || !raw.startsWith('https://')) {
      return `http://${raw}`;
    }
    return raw;
  }
}
module.exports = dealWith;