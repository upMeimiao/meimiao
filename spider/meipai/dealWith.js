/**
 * Created by ifable on 16/6/22.
 */
const async = require('async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    this.classification = ['热门', '直播', '搞笑', '明星名人', '明星', '女神', '舞蹈', '音乐', '美食', '美妆', '男神', '宝宝', '宠物', '吃秀', '手工', '游戏'];
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (callback) => {
          this.getUser(task, (err) => {
            callback(null, '用户信息已返回');
          });
        },
        media: (callback) => {
          this.getTotal(task, (err) => {
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
    const option = {
      url: this.settings.spiderAPI.meipai.userInfo + task.id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        return callback();
      }
      if (result.statusCode != 200) {
        logger.error('获取粉丝code error：', result.statusCode);
        return callback();
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('json error:', result.body);
        return callback();
      }
      const user = {
        platform: 5,
        bid: result.id,
        fans_num: result.followers_count
      };
      result = null;
      this.sendUser(user, (err, result) => {
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
        logger.error('occur error:', err);
        logger.info(`返回美拍用户 ${user.bid} 连接服务器失败`);
        return callback(err);
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`美拍用户 ${user.bid} json数据解析失败`);
        logger.info(back);
        return callback(e);
      }
      if (back.errno == 0) {
        logger.debug('美拍用户:', `${user.bid} back_end`);
      } else {
        logger.error('美拍用户:', `${user.bid} back_error`);
        logger.info(back);
        logger.info('user info: ', back);
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
      if (result.errno == 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(result);
      }
    });
  }
  getTotal(task, callback) {
    const option = {
      url: this.settings.spiderAPI.meipai.userInfo + task.id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info(result);
        return callback(e);
      }
      let videos_count = result.videos_count, page;
      task.total = videos_count;
      if (videos_count % 20 == 0) {
        page = videos_count / 20;
      } else {
        page = Math.floor(videos_count / 20) + 1;
      }
      result = null;
      this.getVideos(task, page, () => {
        callback();
      });
    });
  }
  getVideos(task, page, callback) {
    let maxId = '', sign = 1, option = {};
    async.whilst(
            () => sign <= page,
            (cb) => {
              option.url = `${this.settings.spiderAPI.meipai.mediaList + task.id}&max_id=${maxId}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.error('occur error : ', err);
                  sign++;
                  return cb();
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.error('json数据解析失败');
                  logger.info(result);
                  sign++;
                  return cb();
                }
                if (!result || result.length == 0) {
                  logger.error('数据解析异常失败');
                  logger.error(result);
                  sign++;
                  return cb();
                }
                maxId = result[result.length - 1].id;
                this.deal(task, result, () => {
                  sign++;
                  cb();
                });
              });
            },
            (err, result) => {
              callback();
            }
        );
  }
  deal(task, list, callback) {
    let id, sign = true;
    async.whilst(
            () => sign,
            (cb) => {
              id = list.shift().id;
              this.getInfo(task, id, (err) => {
                if (list.length === 0) {
                  sign = false;
                }
                cb();
              });
            },
            (err, result) => {
              callback();
            }
        );
  }
  getInfo(task, id, callback) {
    const option = {
      url: this.settings.spiderAPI.meipai.media + id
    };
    let title = '', _tags = [], __tags = [], tags = '', tagArr;
    request.get(logger, option, (err, result) => {
      if (err) {
        return callback(err);
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info(result.body);
        result = null;
        return callback(e);
      }
      if (result.lives) {
        result = null;
        return callback();
      }
      if (result.caption && result.caption != '') {
        title = result.caption.substr(0, 100);
        tagArr = result.caption.match(/#[^0-9a-zA-Z\x00-\xff]+#/ig);
        if (tagArr) {
          for (const [index, elem] of tagArr.entries()) {
            _tags.push(elem.replace(/#/g, ''));
            if (this.classification.includes(elem.replace(/#/g, ''))) {
              __tags.push(elem.replace(/#/g, ''));
            }
          }
          if (__tags.length != 0) {
            tags = __tags.join(',');
          }
        }
                // for( let i in tagArr){
                //     _tags.push(tagArr[i].replace(/#/g,''))
                // }
                // for( let i in _tags){
                //     if(this.classification.includes(_tags[i])){
                //         __tags.push(_tags[i])
                //     }
                // }
                // if(__tags.length != 0){
                //     tags = __tags.join(',')
                // }
      } else {
        title = 'btwk_caihongip';
      }
      const media = {
        author: result.user.screen_name,
        platform: 5,
        bid: task.id,
        aid: result.id,
        title: title.replace(/"/g, ''),
        desc: title.replace(/"/g, ''),
        play_num: result.plays_count,
        comment_num: result.comments_count,
        support: result.likes_count,
        forward_num: result.reposts_count,
        a_create_time: result.created_at,
        long_t: result.time,
        v_img: result.cover_pic,
        tag: _tags.join(','),
        class: tags
      };
      title = null;
      _tags = null;
      tags = null;
      tagArr = null;
      result = null;
      __tags = null;
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
}
module.exports = dealWith;