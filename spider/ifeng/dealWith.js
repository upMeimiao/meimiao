const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const moment = require('moment');

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
    this.getTotal(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }
  getTotal(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.ifeng.medialist + task.id}&pageNo=1&platformType=iPhone&protocol=1.0.1`,
      ua: 3,
      own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        callback(error);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.error('json error: ', result.body);
        callback(e);
        return;
      }
      if (result.infoList.length === 0) {
        callback('异常错误');
        return;
      }
      task.total = result.infoList[0].weMedia.totalNum;
      const user = {
        platform: task.p,
        bid: task.id,
        fans_num: result.infoList[0].weMedia.followNo
      };
      async.parallel({
        user: (cb) => {
          this.sendUser(user, () => {
            cb(null, '用户信息已返回');
          });
          this.sendStagingUser(user);
        },
        media: (cb) => {
          this.getList(task, result.infoList[0].weMedia.totalPage, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '视频信息已返回');
          });
        }
      }, (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        logger.debug('result:', result);
        callback();
      });
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
        logger.error(`凤凰用户 ${user.bid} json数据解析失败`);
        logger.error(result);
        callback(e);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('凤凰用户: ', `${user.bid} back_end`);
      } else {
        logger.error('凤凰用户: ', `${user.bid} back_error`);
        logger.error(result);
        logger.error('user info: ', user);
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
        logger.error('send error:', result);
        return;
      }
      if (Number(result.errno) === 0) {
        logger.debug('凤凰用户:', `${user.bid} back_end`);
      } else {
        logger.error('凤凰用户:', `${user.bid} back_error`);
        logger.error(result);
      }
    });
  }
  getList(task, page, callback) {
    let index = 1, list = null;
    const option = {
      ua: 3,
      own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
    };
    if (page == 0) {
      page = 1;
    }
    async.whilst(
      () => index <= Math.min(page, 500),
      (cb) => {
        logger.debug(`开始获取第${index}页视频列表`);
        option.url = `${this.settings.spiderAPI.ifeng.medialist + task.id}&pageNo=${index}&platformType=iPhone&protocol=1.0.1`;
        request.get(logger, option, (err, result) => {
          if (err) {
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.error('json error: ', result.body);
            index += 1;
            cb();
            return;
          }
          if (!result.infoList) {
            logger.debug('偶然性的数据返回失败');
            cb();
            return;
          }
          if (result.infoList.length <= 0) {
            index += 1;
            cb();
            return;
          }
          list = result.infoList[0].bodyList;
          this.deal(task, list, () => {
            index += 1;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  deal(task, list, callback) {
    let index = 0;
    async.whilst(
      () => index < list.length,
      (cb) => {
        this.getVideo(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getVideo(task, video, callback) {
    const option = {
      url: this.settings.spiderAPI.ifeng.info + video.memberItem.guid,
      ua: 3,
      own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
    };
    let media;
    request.get(logger, option, (error, result) => {
      if (error) {
        callback(error);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.error('json error: ', result.body);
        callback(e);
        return;
      }
      async.parallel(
        [
          (cb) => {
            option.url = `http://survey.news.ifeng.com/getaccumulator_ext.php?key=${video.memberItem.guid}ding&format=js&serverid=1&var=ding`;
            option.own_ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36';
            this._ding(option, (err, result) => {
              cb(result);
            });
          },
          (cb) => {
            option.url = `http://survey.news.ifeng.com/getaccumulator_ext.php?key=${video.memberItem.guid}cai&format=js&serverid=1&var=cai`;
            option.own_ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36';
            this._cai(option, (err, result) => {
              cb(result);
            });
          }
        ],
        (err, data) => {
          media = {
            author: task.name,
            platform: task.p,
            bid: task.id,
            aid: result.itemId,
            title: result.title ? result.title.substr(0, 100).replace(/"/g, '') : 'btwk_caihongip',
            desc: result.abstractDesc ? result.abstractDesc.substr(0, 100).replace(/"/g, '') : (result.name ? result.name.substr(0, 100).replace(/"/g, '') : ''),
            play_num: result.playTime,
            comment_num: result.commentNo,
            a_create_time: moment(result.createDate).format('X'),
            v_img: result.image,
            long_t: result.duration,
            tag: video.tag,
            support: data[0],
            step: data[1],
            v_url: video.memberItem.pcUrl
          };
          spiderUtils.saveCache(this.core.cache_db, 'cache', media);
          spiderUtils.commentSnapshots(this.core.taskDB,
            { p: media.platform, aid: media.aid, comment_num: media.comment_num });
          callback();
        }
      );
    });
  }
  _ding(option, callback) {
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('凤凰视频顶量请求失败信息', err);
        callback(null, '');
        return;
      }
      result = result.body.replace('var ding=', '').replace(';', '');
      try {
        result = JSON.parse(result);
      } catch (e) {
        logger.debug('凤凰视频顶量解析失败', result);
        callback(null, '');
        return;
      }
      callback(null, result.browse);
    });
  }
  _cai(option, callback) {
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('凤凰视频顶量请求失败信息', err);
        callback(null, '');
        return;
      }
      result = result.body.replace('var cai=', '').replace(';', '');
      try {
        result = JSON.parse(result);
      } catch (e) {
        logger.debug('凤凰视频顶量解析失败');
        callback(null, '');
        return;
      }
      callback(null, result.browse);
    });
  }
}
module.exports = dealWith;