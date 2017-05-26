/**
 * Created by zhupenghui on 17/4/12.
 */
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');

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
    async.series(
      {
        user: (cb) => {
          this.getUserInfo(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '用户信息已返回');
          });
        },
        media: (cb) => {
          this.getListInfo(task, (err) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, '视频信息已返回');
          });
        }
      },
      (err, result) => {
        logger.debug('result', result);
        if (err) {
          callback(err);
          return;
        }
        callback(null, task.total);
      }
    );
  }
  getUserInfo(task, callback) {
    const option = {
      url: `https://www.facebook.com/pg/${task.id}/likes/?ref=page_internal`,
      // proxy: 'http://127.0.0.1:56777',
      referer: `https://www.facebook.com/pg/${task.id}/likes/?ref=page_internal`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      const renderFollowsData = result.indexOf('renderFollowsData');
      if (renderFollowsData === -1) {
        logger.debug('没有粉丝数');
        callback();
        return;
      }
      result = result.substr(renderFollowsData);
      const fans = result.match(/,(\d*)],\[\]\],\["PagesLikesTab",/);
      if (!fans) {
        logger.debug('没有找到');
        callback();
        return;
      }
      const res = {
        bid: task.id,
        platform: task.p,
        fans_num: fans[1]
      };
      // logger.info(res);
      // this.sendUser(res);
      this.sendStagingUser(res);
      callback();
    });
  }
  sendUser(user) {
    const option = {
      url: this.settings.sendFans,
      data: user
    };
    request.post(logger, option, (err, back) => {
      if (err) {
        return;
      }
      try {
        back = JSON.parse(back.body);
      } catch (e) {
        logger.error(`facebook视频用户 ${user.bid} json数据解析失败`);
        logger.error(back);
        return;
      }
      if (Number(back.errno) === 0) {
        logger.debug('facebook视频用户:', `${user.bid} back_end`);
      } else {
        logger.error('facebook视频用户:', `${user.bid} back_error`);
        logger.error(back);
        logger.error('user info: ', user);
      }
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
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.error(result);
      }
    });
  }
  getListInfo(task, callback) {
    const option = {
      ua: 1,
      // proxy: 'http://127.0.0.1:56777',
      referer: 'https://www.facebook.com'
    };
    let cursor = null,
      lastVid = null,
      cycle = true,
      $;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.facebook.list}{"last_fbid":${lastVid},"page":${task.id},"playlist":null,"cursor":"${cursor}"}&__user=0&__a=1`;
        request.get(logger, option, (err, result) => {
          if (err) {
            cb();
            return;
          }
          try {
            result = result.body.replace(/for \(;;\);/, '').replace(/[\n\r]/g, '');
            result = JSON.parse(result);
          } catch (e) {
            logger.error(result);
            cb();
            return;
          }
          $ = cheerio.load(result.payload);
          task.total += $('td').length;
          if (!result.jscc_map) {
            cycle = false;
          } else {
            result = result.jscc_map.substring(result.jscc_map.indexOf('", {') + 2, result.jscc_map.indexOf(', null)'));
            result = JSON.parse(result);
            cursor = result.cursor;
            lastVid = result.last_fbid;
          }
          this.deal(task, $('td'), () => {
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
        this.getMedia(task, list.eq(index), () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getMedia(task, video, callback) {
    let aid = video.find('div._3v4h>a').attr('href');
    aid = aid ? aid.split('/')[3] : video.find('div._5asl>a.__-q').attr('href').split('/')[3];
    const time = video.find('div._5ig6').text();
    async.series(
      [
        (cb) => {
          this.getVidInfo(task, aid, (err, result) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        let media = {
          author: task.name,
          platform: task.p,
          bid: task.id,
          aid,
          title: result[0].title,
          desc: result[0].desc,
          v_img: video.find('div._46-h img').attr('src'),
          support: result[0].ding,
          comment_num: result[0].commentNum,
          play_num: result[0].playNum,
          forward_num: result[0].sharecount,
          long_t: spiderUtils.longTime(time),
          a_create_time: result[0].time
        };
        // logger.debug(media);
        media = spiderUtils.deleteProperty(media);
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        // spiderUtils.commentSnapshots(this.core.taskDB,
        //   { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getVidInfo(task, vid, callback) {
    const option = {
      url: `${this.settings.spiderAPI.facebook.vidInfo}"v":"${vid}","firstLoad":true,"ssid":${new Date().getTime()}}&__user=0&__a=1`,
      ua: 1,
      // proxy: 'http://127.0.0.1:56777',
      referer: `https://www.facebook.com/${task.id}/?fref=ts`,
      Cookie: task.cookies,
    };
    option.url = option.url.replace(/'/g, '"').replace(/[\\]/g, '');
    // logger.debug(option);
    let dataJson = null,
      time, title, desc, playNum, commentNum, ding, sharecount, $, _$, vImg;
    option.url = option.url.toString().replace(/'/g, '"');
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('facebook单个视频信息接口请求失败', err);
        if (err.status == 500) {
          spiderUtils.sendError(this.core.taskDB, this.core.auth.email, () => {
            process.exit();
          });
          return;
        }
        this.getVidInfo(task, vid, callback);
        return;
      }
      try {
        result = result.body.replace(/for \(;;\);/, '').replace(/[\n\r]/g, '');
        result = JSON.parse(result);
      } catch (e) {
        logger.error('facebook单个视频信息解析失败', result);
        this.getVidInfo(task, vid, callback);
        return;
      }
      for (let i = 0; i < result.jsmods.markup.length; i += 1) {
        if (result.jsmods.markup[i][2] == 16) {
          _$ = cheerio.load(result.jsmods.markup[i][1].__html);
          break;
        }
      }
      for (let i = 0; i < result.jsmods.markup.length; i += 1) {
        if (result.jsmods.markup[i][1].__html) {
          $ = cheerio.load(result.jsmods.markup[i][1].__html);
          if ($('div.snowliftPayloadRoot').length <= 1 && $('div.snowliftPayloadRoot ._hli').text()) {
            $ = cheerio.load(result.jsmods.markup[i][1].__html);
            break;
          }
        }
      }
      time = $('a._39g5>abbr').attr('data-utime');
      title = spiderUtils.stringHandling($('span.hasCaption').text(), 80);
      desc = spiderUtils.stringHandling($('span.hasCaption').text(), 100);
      playNum = $('div._4p3v>span.fcg').text().replace('次播放', '').replace(/[\s,]/g, '');
      vImg = _$('img._1445').attr('style').replace('background-image: url(', '').replace(');', '');
      vImg = decodeURIComponent(vImg);
      dataJson = result.jsmods.require;
      for (let i = 0; i < dataJson.length; i += 1) {
        if (dataJson[i][0] === 'UFIController' && dataJson[i][3][1].ftentidentifier == vid) {
          commentNum = dataJson[i][3][2].feedbacktarget.commentcount;
          ding = dataJson[i][3][2].feedbacktarget.likecount;
          sharecount = dataJson[i][3][2].feedbacktarget.sharecount;
          break;
        }
      }
      dataJson = {
        time: time || null,
        title: title || 'btwk_caihongip',
        desc: desc || '',
        playNum: playNum || null,
        vImg: vImg || '',
        commentNum: commentNum || null,
        ding: ding || null,
        sharecount: sharecount || null
      };
      callback(null, dataJson);
    });
  }
}
module.exports = dealWith;