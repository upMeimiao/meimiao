/**
 * Created by ifable on 2017/3/23.
 */
const moment = require('moment');
const async = require('neo-async');
const request = require('request');
const spiderUtils = require('../../lib/spiderUtils');
// const python = require('python.js');

// const sys = python.import('sys');
// sys.path.append(__dirname);
// const py = python.import('py_json');

let logger;

class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    this.api = this.settings.spiderAPI.youtube;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    logger.debug('start spider')
    task.total = 0;
    this.channel(task, (err) => {
      if (err) {
        callback(err);
      } else {
        callback(null, task.total);
      }
    });
  }
  channel(task, callback) {
    const options = {
      method: 'GET',
      url: `${this.api.channel}${task.id}`,
      timeout: 3000,
      // proxy: 'http://127.0.0.1:56428',
      qs: {
        ajax: '1',
        layout: 'mobile',
        tsp: '1',
        utcoffset: '480'
      },
      headers: {
        'accept-language': 'zh-CN,zh;q=0.8',
        referer: `${this.api.channel}${task.id}`,
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/10.0 Mobile/14A300 Safari/602.1',
        'x-client-data': 'CI22yQEIorbJAQjBtskBCIOaygEI+5zKAQipncoBCIuiygE=',
        'x-spf-referer': `https://m.youtube.com/channel/${task.id}`,
        'x-youtube-client-version': '1.20170518',
        'x-youtube-variants-checksum': '3023dfba2565def6426cc7d28fd6f71f',
        'x-youtube-page-label': 'youtube_20170518_0_RC3',
        'x-youtube-page-cl': '156517915',
        'x-chrome-uma-enabled': '1',
        accept: '*/*',
        dnt: '1',
        'cache-control': 'no-cache'
      }
    };
    logger.debug(options)
    request(options, (error, response, body) => {
      if (error) {
        logger.error('occur error : ', error.message);
        return callback(error.message);
      }
      if (response.statusCode !== 200) {
        logger.error(`list error code: ${response.statusCode}`);
        return callback(JSON.stringify({ statusCode: response.statusCode }));
      }
      try {
        body = JSON.parse(body.replace(')]}\'', ''));
      } catch (e) {
        logger.error('channel json error', body);
        return callback(e.message);
      }
      const fansInfo = {
          platform: task.p,
          bid: task.id,
          fans_num: spiderUtils.numberHandling(body.content.header.subscribe_button.subscriber_count_text.runs[0].text)
        },
        listArg = {
          itct: body.content.tab_settings.available_tabs[1].content.continuations[0].click_tracking_params,
          ctoken: body.content.tab_settings.available_tabs[1].content.continuations[0].continuation
        };
      body = null;
      this.channelDeal(task, fansInfo, listArg, () => {
        callback();
      });
    });
  }
  channelDeal(task, fansInfo, listArg, callback) {
    async.parallel({
      user: (cb) => {
        this.sendUser(fansInfo, () => {
          cb(null, '用户信息已返回');
        });
        this.sendStagingUser(fansInfo);
        // callback(null,'用户信息已返回')
      },
      media: (cb) => {
        this.getList(task, listArg, (err) => {
          if (err) {
            return cb(err);
          }
          cb(null, '视频信息已返回');
        });
      }
    }, (err, result) => {
      if (err) {
        return callback(err);
      }
      logger.debug('result : ', result);
      callback();
    });
  }
  sendUser(user, callback) {
    const options = {
      method: 'POST',
      url: this.settings.sendFans,
      form: user
    };
    request(options, (err, res, body) => {
      if (err) {
        logger.error('occur error : ', err);
        logger.info(`返回YouTube用户 ${user.bid} 连接服务器失败`);
        return callback(err);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error(`YouTube用户 ${user.bid} json数据解析失败`);
        logger.info(body);
        return callback(e);
      }
      if (Number(body.errno) === 0) {
        logger.debug('YouTube用户:', `${user.bid} back_end`);
      } else {
        logger.error('YouTube用户:', `${user.bid} back_error`);
        logger.info(body);
        logger.info('user info: ', user);
      }
      callback();
    });
  }
  sendStagingUser(user) {
    const options = {
      method: 'POST',
      url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
      form: user
    };
    request(options, (err, res, body) => {
      if (err) {
        logger.error('occur error : ', err);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info('send error:', body);
        return;
      }
      if (Number(body.errno) === 0) {
        logger.debug('用户:', `${user.bid} back_end`);
      } else {
        logger.error('用户:', `${user.bid} back_error`);
        logger.info(body);
      }
    });
  }
  getList(task, listArg, callback) {
    let sign = true, index = 0, conetents, conetent;
    const options = {
      method: 'GET',
      url: `${this.api.channel}${task.id}`,
      timeout: 3000,
      // proxy: 'http://127.0.0.1:56428',
      qs: {
        action_continuation: '1',
        ajax: '1',
        layout: 'mobile',
        tsp: '1',
        utcoffset: '480',
        itct: listArg.itct,
        ctoken: listArg.ctoken
      },
      headers: {
        'accept-language': 'zh-CN,zh;q=0.8',
        referer: `${this.api.channel}${task.id}`,
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/10.0 Mobile/14A300 Safari/602.1',
        'x-client-data': 'CI22yQEIorbJAQjBtskBCIOaygEI+5zKAQipncoBCIuiygE=',
        'x-spf-referer': `https://m.youtube.com/channel/${task.id}`,
        'x-youtube-client-version': '1.20170518',
        'x-youtube-variants-checksum': '3023dfba2565def6426cc7d28fd6f71f',
        'x-youtube-page-label': 'youtube_20170518_0_RC3',
        'x-youtube-page-cl': '156517915',
        'x-chrome-uma-enabled': '1',
        accept: '*/*',
        dnt: '1',
        'cache-control': 'no-cache'
      }
    };
    async.whilst(
      () => sign || index > 333,
      (cb) => {
        logger.debug(options)
        request(options, (error, response, body) => {
          if (error) {
            logger.error(error);
            return cb();
          }
          if (response.statusCode !== 200) {
            logger.error(response.statusCode);
            return cb();
          }
          // const _data = py.test(body.replace(')]}\'', ''));
          // logger.debug(_data);
          try {
            body = JSON.parse(body.replace(')]}\'', '').replace(/\\U000[a-zA-Z0-9]{5}/g, ''));
          } catch (e) {
            logger.error(e);
            // logger.error(body);
            return cb();
          }
          index += 1;
          if (body.content.continuation_contents.contents[0].continuations) {
            conetents = body.content.continuation_contents.contents[0];
            if (conetents.continuations.length === 0) {
              sign = false;
              task.total = conetents.contents.length;
            } else {
              options.qs.itct = conetents.continuations[0].click_tracking_params;
              options.qs.ctoken = conetents.continuations[0].continuation;
            }
            conetent = conetents.contents;
          } else {
            conetents = body.content.continuation_contents;
            if (conetents.continuations[0].item_type === 'previous_continuation_data') {
              sign = false;
              task.total = (30 * (index - 1)) + conetents.contents.length;
            } else {
              options.qs.itct = conetents.continuations[0].click_tracking_params;
              options.qs.ctoken = conetents.continuations[0].continuation;
            }
            conetent = conetents.contents;
          }
          body = null;
          this.deal(task, conetent, () => cb());
        });
      },
      () => {
        callback();
      }
  );
  }
  deal(task, list, callback) {
    let index = 0;
    // logger.debug(`list length: ${list.length}`)
    async.whilst(
      () => index < list.length,
      (cb) => {
        this.getInfo(task, list[index], () => {
          // if(err){
          //     return setTimeout(()=>{
          //         cb()
          //     }, 500)
          // }
          setTimeout(() => {
            index += 1;
            cb();
          }, 100);
        });
      },
      () => {
        callback();
      }
  );
  }
  getInfo(task, video, callback) {
    const options = {
      method: 'GET',
      url: this.api.info,
      timeout: 5000,
      // proxy: 'http://127.0.0.1:56428',
      qs: {
        ajax: '1',
        // debug_prerolls: 'false',
        itct: video.endpoint.click_tracking_params,
        layout: 'mobile',
        sts: '17302',
        tsp: '1',
        utcoffset: '480',
        v: video.encrypted_id
      },
      headers: {
        'accept-language': 'zh-CN,zh;q=0.8',
        referer: `https://m.youtube.com/watch?v=${video.encrypted_id}`,
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/10.0 Mobile/14A300 Safari/602.1',
        'x-client-data': 'CI22yQEIorbJAQjBtskBCIOaygEI+5zKAQipncoBCIuiygE=',
        'x-spf-referer': `https://m.youtube.com/channel/${task.id}`,
        'x-youtube-client-version': '1.20170518',
        'x-youtube-variants-checksum': '3023dfba2565def6426cc7d28fd6f71f',
        'x-youtube-page-label': 'youtube_20170518_0_RC3',
        'x-youtube-page-cl': '156517915',
        'x-chrome-uma-enabled': '1',
        accept: '*/*',
        dnt: '1',
        'cache-control': 'no-cache'
      }
    };
    logger.debug(options)
    request(options, (error, response, body) => {
      if (error) {
        logger.error('info error : ', error.message);
        return callback(error.message);
      }
      if (response.statusCode !== 200) {
        logger.error(`info error code: ${response.statusCode}`);
        return callback(JSON.stringify({ statusCode: response.statusCode }));
      }
      try {
        body = JSON.parse(body.replace(')]}\'', '').replace(/\\U000[a-zA-Z0-9]{5}/g, ''));
      } catch (e) {
        logger.error(`info json parse:${e.message}`);
        logger.error(body);
        return callback(e.message);
      }
      let { video_main_content, swfcfg, comment_section } = body.content;
      body = null;
      let media = {
        author: task.name,
        platform: task.p,
        bid: task.id,
        aid: video.encrypted_id,
        title: spiderUtils.stringHandling(swfcfg.args.title),
        desc: _desc(video_main_content.contents),
        class: _class(video_main_content.contents),
        tag: swfcfg.args.keywords,
        v_img: swfcfg.args.iurlsd || swfcfg.args.iurlhq || swfcfg.args.iurlmq || swfcfg.args.thumbnail_url,
        long_t: swfcfg.args.length_seconds,
        play_num: spiderUtils.numberHandling(swfcfg.args.view_count),
        comment_num: _comment(comment_section.header.count_text),
        support: spiderUtils.numberHandling(video_main_content.contents[0].like_button.like_count),
        step: spiderUtils.numberHandling(video_main_content.contents[0].like_button.dislike_count),
        a_create_time: _time(video_main_content.contents[0].date_text.runs[0].text)
      };
      video_main_content = null;
      swfcfg = null;
      comment_section = null;
      if (media.aid === '1tdkNxAClrw') {
        logger.debug(media);
      }
      // logger.debug(media.aid)
      media = spiderUtils.deleteProperty(media);
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      callback();
    });
  }
}
function _desc(raw) {
  if (!raw || raw.length === 0 || !raw[0].description || !raw[0].description.runs || raw[0].description.runs.length === 0 || !raw[0].description.runs[0].text) {
    return '';
  }
  return spiderUtils.stringHandling(raw[0].description.runs[0].text, 100);
}
function _class(raw) {
  let str = '';
  if (!raw || raw.length === 0 || !raw[0].metadata_row_container || !raw[0].metadata_row_container.rows || raw[0].metadata_row_container.rows.length === 0) {
    return str;
  }
  for (const [index, elem] of raw[0].metadata_row_container.rows.entries()) {
    if (elem.title.runs[0].text === '类别') {
      str = elem.contents[0].runs[0].text;
    }
  }
  raw = null;
  return str;
}
function _comment(raw) {
  if (!raw || !raw.runs || raw.runs.length < 2 || raw.runs[0].text !== '评论') {
    return null;
  }
  return spiderUtils.numberHandling(raw.runs[1].text.replace(/[()（）]/g, ''));
}
function _time(raw) {
  raw = raw.replace('发布', '');
  if (raw === '') {
    return 0;
  }
  return moment(raw, 'YYYY年M月D日').unix();
}
module.exports = dealWith;