/**
 * Created by junhao on 16/6/20.
 */
const moment = require('moment');
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const jsonp = function (data) {
  return data;
};
let logger;
const tags = (raw) => {
  if (typeof raw === 'string') {
    return raw.replace(/\s+/g, ',').replace(/"/g, '').replace(/\[/g, '').replace(/\]/g, '');
  }
  if (Object.prototype.toString.call(raw) === '[object Array]') {
    return raw.join(',');
  }
  return '';
};
const longT = (time) => {
  const timeArr = time.split(':');
  let _longT = '';
  if (timeArr.length === 2) {
    _longT = moment.duration(`00:${time}`).asSeconds();
  } else if (timeArr.length === 3) {
    _longT = moment.duration(time).asSeconds();
  }
  return _longT;
};
const time = (string) => {
  if (string.indexOf('-') !== -1) {
    return moment(string).unix();
  }
  if (string.indexOf('小时') !== -1) {
    string = string.substring(0, string.indexOf('小时'));
    return moment(moment().subtract(Number(string), 'h').format('YYYY-MM-DD')).unix();
  }
  if (string.indexOf('分钟') !== -1) {
    return moment(moment().format('YYYY-MM-DD')).unix();
  }
  return '';
};
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
          this.getUser(task, () => {
            cb(null, '用户信息已返回');
          });
        },
        media: (cb) => {
          this.getTotal(task, (err) => {
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
  getTotal(task, callback) {
    logger.debug('开始获取视频总数');
    const option = {
      url: `${this.settings.spiderAPI.tencent.videoList + task.id}&pagenum=1`
    };
    logger.debug(option)
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.stringify(result.body.substring(6, result.body.length - 1)).replace(/[\s\n\r\\]/g, '');
        result = JSON.parse(result.substring(1, result.length - 1));
      } catch (e) {
        logger.error('解析失败', result);
        callback(e);
        return;
      }
      if (result.s !== 'o') {
        logger.error(`异常错误${result.em}`);
        callback(result.em);
        return;
      }
      if (!result.vtotal && result.vtotal !== 0) {
        logger.error('异常错误');
        callback(JSON.stringify(result));
        return;
      }
      task.total = result.vtotal;
      this.getList(task, result.vtotal, (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback();
      });
    });
  }
  getUser(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.tencent.user + task.id}&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback();
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('tencent jsonp error: ', result);
        callback();
        return;
      }
      const user = {
        platform: 4,
        bid: task.id,
        fans_num: result.followcount.indexOf('万') === -1 ? result.followcount : Number(result.followcount.replace(/万/g, '')) * 10000
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
        logger.error('occur error : ', err);
        logger.info(`返回腾讯视频用户 ${user.bid} 连接服务器失败`);
        callback(err);
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`腾讯视频用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        callback(e);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('腾讯视频用户:', `${user.bid} back_end`);
      } else {
        logger.error('腾讯视频用户:', `${user.bid} back_error`);
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
        logger.error('occur error : ', err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('send error:', result);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getList(task, total, callback) {
    const option = {};
    let sign = 1,
      page,
      list;
    if (total % 25 === 0) {
      page = total / 25;
    } else {
      page = Math.ceil(total / 25);
    }
    async.whilst(
      () => sign <= Math.min(page, 400),
      (cb) => {
        logger.debug(`开始获取第${sign}页视频列表`);
        option.url = `${this.settings.spiderAPI.tencent.videoList + task.id}&pagenum=${sign}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb();
            return;
          }
          try {
            result = JSON.stringify(result.body.substring(6, result.body.length - 1)).replace(/[\s\n\r\\]/g, '');
            result = JSON.parse(result.substring(1, result.length - 1));
          } catch (e) {
            logger.error('列表解析失败', result);
            sign += 1;
            cb();
            return;
          }
          list = result.videolst;
          if (list) {
            this.deal(task, list, () => {
              sign += 1;
              cb();
            });
          } else {
            sign += 1;
            cb();
          }
        });
      },
      () => {
        callback();
      }
    );
  }
  deal(task, list, callback) {
    const length = list.length;
    let index = 0;
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
  getInfo(task, data, callback) {
    async.parallel([
      (cb) => {
        this.getView(data.vid, (err, num) => {
          if (err) {
            cb(err);
          } else {
            cb(null, num);
          }
        });
      },
      (cb) => {
        this.getComment(data.vid, (err, num) => {
          if (err) {
            cb(err);
          } else {
            cb(null, num);
          }
        });
      },
      (cb) => {
        this.getVidTag(data.vid, (err, _tags) => {
          if (err) {
            cb(err);
          } else {
            cb(null, _tags);
          }
        });
      }],
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        const media = {
          author: task.name,
          platform: 4,
          bid: task.id,
          aid: data.vid,
          title: data.title.substr(0, 100).replace(/"/g, ''),
          desc: data.desc.substr(0, 100).replace(/"/g, ''),
          play_num: result[0],
          comment_num: result[1],
          a_create_time: time(data.uploadtime),
          // 新加字段
          v_img: data.pic,
          long_t: longT(data.duration),
          tag: tags(result[2])
        };
        if (!media.comment_num) {
          delete media.comment_num;
        }
        if (!media.tag) {
          delete media.tag;
        }
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      });
  }
  getView(id, callback) {
    const option = {
      url: this.settings.spiderAPI.tencent.view + id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      const backData = eval(result.body),
        back = backData.results;
      if (!back) {
        callback(true);
        return;
      }
      if (back[0].fields) {
        callback(null, back[0].fields.view_all_count);
      } else {
        callback(null, 0);
      }
    });
  }
  getComment(id, callback) {
    const option = {
      url: this.settings.spiderAPI.tencent.commentId + id
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        logger.error('occur error : ', error);
        callback(error);
        return;
      }
      let backData;
      try {
        backData = eval(result.body);
      } catch (e) {
        logger.error('腾讯获取评论数jsonp解析失败');
        logger.error(result.body);
        callback(e);
        return;
      }
      if (!backData.result) {
        logger.error('腾讯获取评论数异常错误');
        logger.error(backData);
        callback(true);
        return;
      }
      if (backData.result.code == 0) {
        this.getCommentNum(backData.comment_id, (err, num) => {
          if (err) {
            callback(err);
            return;
          }
          callback(null, num);
        });
      } else {
        callback(true);
      }
    });
  }
  getCommentNum(id, callback) {
    const option = {
      url: `${this.settings.spiderAPI.tencent.commentNum + id}/commentnum?_=${new Date().getTime()}`,
      referer: 'https://v.qq.com/txyp/coralComment_yp_1.0.htm',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`获取视频${id}评论解析JSON错误`);
        logger.info(result);
        callback(null, null);
        return;
      }
      if (result.errCode == 0) {
        callback(null, result.data.commentnum);
      } else {
        callback(null, null);
      }
    });
  }
  getVidTag(vid, callback) {
    const option = {
      url: `http://c.v.qq.com/videoinfo?otype=json&callback=jsonp&low_login=1&vid=${vid}&fields=recommend%7Cedit%7Cdesc%7Cnick%7Cplaycount`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        callback(null, null);
        return;
      }
      if (!result.v || result.v.length === 0) {
        callback(null, null);
        return;
      }
      const tagStr = result.v[0].tags_video;
      callback(null, tagStr);
    });
  }
}
module.exports = dealWith;