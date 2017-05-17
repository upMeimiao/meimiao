/**
 * Created by ifable on 2016/11/15.
 */
const async = require('async');
const cheerio = require('cheerio');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const jsonp = function (data) {
  return data;
};
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    this.api = spiderCore.settings.spiderAPI.iqiyi;
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
  getUser(task, callback) {
    const option = {
      url: `http://www.iqiyi.com/u/${task.id}`,
      referer: `http://www.iqiyi.com/u/${task.id}`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      const $ = cheerio.load(result.body),
        fansDom = $('em.count a');
      if (fansDom.length === 0) {
        this.get_user(task, () => {
          callback();
        });
        return;
      }
      const fans = fansDom.attr('data-countnum'),
        user = {
          platform: 2,
          bid: task.id,
          fans_num: fans
        };
      // logger.debug(user);
      if (user.fans_num === '') {
        callback();
        return;
      }
      this.sendUser(user, () => {
        callback();
      });
      this.sendStagingUser(user);
    });
  }
  get_user(task, callback) {
    const option = {
      url: `http://m.iqiyi.com/u/${task.id}/fans`,
      referer: `http://m.iqiyi.com/u/${task.id}`,
      ua: 2
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      const $ = cheerio.load(result.body),
        fansDom = $('h3.tle').text(),
        user = {
          platform: 2,
          bid: task.id,
          fans_num: fansDom.substring(2)
        };
      if (user.fans_num === '') {
        callback();
        return;
      }
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
    request.post(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error(`爱奇艺用户 ${user.bid} json数据解析失败`);
        logger.error(result);
        callback(e);
        return;
      }
      if (result.errno == 0) {
        logger.debug('爱奇艺用户:', `${user.bid} back_end`);
      } else {
        logger.error('爱奇艺用户:', `${user.bid} back_error`);
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
        logger.error(`爱奇艺用户 ${user.bid} json数据解析失败`);
        logger.error(result);
        return;
      }
      if (result.errno == 0) {
        logger.debug('爱奇艺用户:', `${user.bid} back_end`);
      } else {
        logger.error('爱奇艺用户:', `${user.bid} back_error`);
        logger.error(result);
        logger.error('user info: ', user);
      }
    });
  }
  getTotal(task, callback) {
    const option = {
      ua: 1,
      url: `${this.api.list[0] + task.id}&page=1`,
      referer: `http://www.iqiyi.com/u/${task.id}/v`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(JSON.stringify(err));
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.error(result);
        callback(e.message);
        return;
      }
      if (result.code !== 'A00000') {
        callback(JSON.stringify(result));
        return;
      }
      if (result.total !== 0) {
        task.total = result.total * 42;
        this.getList(task, result.total, () => {
          callback();
        });
      } else {
        this.getListN(task, () => {
          callback();
        });
      }
    });
  }
  getListN(task, callback) {
    let index = 1, flag = 0, page = 2, maxPage = 200, // 预设
      sign = true;
    const video = [];
    const option = {
      ua: 1,
      referer: `http://www.iqiyi.com/paopao/u/${task.id}/upload/`
    };
    if (task.id === '1049273642') {
      maxPage = 125;
    }
    async.whilst(
      () => sign && index <= Math.min(page, maxPage),
      (cb) => {
        option.url = `http://timeline.i.iqiyi.com/timeline-api/get_user_timeline?uids=${task.id}&page=${index}&page_size=40&feed_types=30&t=${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error(err);
            if (flag > 2) {
              index += 1;
              cb();
              return;
            }
            return setTimeout(() => {
              flag += 1;
              cb();
            }, 1000);
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            index += 1;
            cb();
            return;
          }
          if (result.code !== 'A00000') {
            index += 1;
            cb();
            return;
          }
          if (index === 1 && result.data.feeds.length === 0) {
            sign = false;
            cb();
            return;
          }
          if (index !== 1 && result.data.feeds.length === 0) {
            index += 1;
            cb();
            return;
          }
          if (index === 1) {
            task.total = result.data.feeds[0].userInfo.publicVideoCount;
            if (task.total % 40 !== 0) {
              page = Math.ceil(task.total / 40);
            } else {
              page = task.total / 40;
            }
          }
          for (let i = 0; i < result.data.feeds.length; i++) {
            video.push({
              id: result.data.feeds[i].resourceContent.videoInfos[0].tvId,
              title: result.data.feeds[i].resourceContent.videoInfos[0].title,
              link: result.data.feeds[i].resourceContent.videoInfos[0].videoLink
            });
          }
          result = null;
          this.dealN(task, video, () => {
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
  dealN(task, video, callback) {
    let index = 0;
    const length = video.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.info(task, video[index], () => {
          index += 1;
          cb();
          // setTimeout(cb,600)
        });
      },
      () => {
        callback();
      }
    );
  }
  getList(task, page, callback) {
    let index = 1, data, $;
    const option = {
      ua: 1,
      referer: `http://www.iqiyi.com/u/${task.id}/v`
    };
    async.whilst(
      () => index <= Math.min(page, 238), // 限制视频数1万
      (cb) => {
        option.url = `${this.api.list[0] + task.id}&page=${index}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.error(result);
            cb();
            return;
          }
          data = result.data;
          $ = cheerio.load(data, {
            ignoreWhitespace: true
          });
          if ($('.wrap-customAuto-ht li').length === 0) {
            index += 1;
            cb();
            return;
          }
          const lis = $('li[tvid]'), ids = [],
            ats = $('a[data-title]'), titles = [],
            href = $('.site-piclist_info a[title]'), links = [];
          for (let i = 0; i < lis.length; i++) {
            ids.push(lis[i].attribs.tvid.replace(/,/g, ''));
          }
          // logger.debug(ids)
          for (let j = 0; j < ats.length; j++) {
            titles.push(ats[j].attribs['data-title']);
          }
          // logger.debug(titles)
          for (let z = 0; z < href.length; z += 1) {
            let id = href[z].attribs.href;
            const end = id.indexOf('#');
            id = id.slice(0, end);
            links.push(id);
          }
          this.deal(task, ids, titles, links, () => {
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
  deal(task, ids, titles, links, callback) {
    let index = 0, data;
    const length = ids.length;
    async.whilst(
      () => index < length,
      (cb) => {
        data = {
          id: ids[index],
          title: titles[index],
          link: links[index]
        };
        this.info(task, data, (err) => {
          if (err) {
            // setTimeout(cb,600)
            index += 1;
            return cb();
          }
          index += 1;
          cb();
          // setTimeout(cb,600)
        });
      },
      () => {
        callback();
      }
    );
  }
  info(task, info, callback) {
    const id = info.id, title = info.title, link = info.link;
    async.parallel(
      [
        (cb) => {
          this.getInfo(id, link, (err, data) => {
            if (err) {
              cb(err);
            } else {
              cb(null, data);
            }
          });
        },
        (cb) => {
          this.getExpr(id, link, (err, data) => {
            if (err) {
              cb(err);
            } else {
              cb(null, data);
            }
          });
        },
        (cb) => {
          this.getPlay(id, link, (err, data) => {
            if (err) {
              cb(err);
            } else {
              cb(null, data);
            }
          });
        }
      ],
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        const media = {
          author: result[0].name,
          platform: 2,
          bid: task.id,
          aid: id,
          title: title ? spiderUtils.stringHandling(title, 80) : 'btwk_caihongip',
          desc: spiderUtils.stringHandling(result[0].desc, 100),
          play_num: result[2],
          support: result[1].data.up,
          step: result[1].data.down,
          comment_num: result[0].comment,
          a_create_time: result[0].time,
          // 新加字段
          v_url: result[0].v_url,
          long_t: result[0].seconds,
          v_img: result[0].picurl,
          class: result[0].type
        };
        if (media.comment_num < 0) {
          delete media.comment_num;
        }
        // logger.debug(media)
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getInfo(id, link, callback) {
    const option = {
      url: `${this.api.info + id}?callback=jsonp&status=1`,
      referer: link,
      ua: 1
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        callback(error);
        return;
      }
      // logger.debug(backData)
      let playData;
      try {
        playData = eval(result.body);
      } catch (e) {
        logger.error('eval错误:', e);
        logger.error(result);
        callback(e);
        return;
      }
      if (playData.code !== 'A00000') {
        callback(true);
        return;
      }
      // console.log(playData)
      const name = playData.data.user.name,
        desc = playData.data.description,
        comment = playData.data.commentCount,
        // 新加字段
        picurl = playData.data.imageUrl,
        typeArr = playData.data.categories,
        seconds = playData.data.duration,
        v_url = playData.data.url;
      let creatTime = parseInt(playData.data.issueTime / 1000, 10),
        type = '';
      if (typeArr && typeArr.length !== 0) {
        const t_arr = [];
        for (const index in typeArr) {
          t_arr[index] = typeArr[index].name;
        }
        type = t_arr.join(',');
      }
      if (creatTime === 0) {
        creatTime = 1349020800;
      }
      const data = {
        name,
        desc,
        comment,
        time: creatTime,
        // 新加字段
        v_url,
        picurl,
        type,
        seconds
      };
      if (comment < 0) {
        this.getComment(playData.data.qitanId,
          playData.data.albumId, playData.data.tvId, link, (err, result) => {
            if (err) {
              callback(null, data);
              return;
            }
            data.comment = result;
            callback(null, data);
          });
      } else {
        callback(null, data);
      }
    });
  }
  getExpr(id, link, callback) {
    const option = {
      url: this.api.expr + id,
      referer: link,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('eval错误:', e);
        logger.error(result);
        callback(e);
        return;
      }
      if (result.code !== 'A00000') {
        callback(true);
        return;
      }
      callback(null, result);
    });
  }
  getPlay(id, link, callback) {
    const option = {
      url: `${this.api.play + id}/?callback=jsonp`,
      referer: link,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.error('eval错误:', e);
        logger.error(result);
        callback(e);
        return;
      }
      callback(null, result[0][id]);
    });
  }
  getComment(qitanId, albumId, tvId, link, callback) {
    const option = {
      url: `http://cmts.iqiyi.com/comment/tvid/${qitanId}_${tvId}_hot_2?is_video_page=true&albumid=${albumId}`,
      referer: link,
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
        logger.error('json err:', e);
        logger.error(result);
        callback(e);
        return;
      }
      callback(null, result.data.$comment$get_video_comments.data.count);
    });
  }
}
module.exports = dealWith;