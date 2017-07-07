/**
 * Created by penghui on 2017/4/27.
 */
const async = require('neo-async');
const req = require('request');
const cheerio = require('cheerio');

let logger;
class getProgram {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('getProgram instantiation ...');
  }
  start(task, callback) {
    this.getProgramTotal(task, (err, result) => {
      callback(null, result);
    });
  }
  getProgramTotal(task, callback) {
    const option = {
        url: `https://www.youtube.com/channel/${task.id}/playlists`,
        proxy: 'http://127.0.0.1:56428',
        headers: {
          'accept-language': 'zh-CN,zh;q=0.8'
        }
      },
      programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      };
    let prolist = null,
      $ = null,
      itct;
    logger.debug('111');
    req(option, (err, response, body) => {
      if (err) {
        logger.debug('专辑请求失败', err);
        this.getProgramTotal(task, callback);
        return;
      }
      if (response.statusCode !== 200) {
        logger.debug('专辑列表请求状态错误', response.statusCode);
        this.getProgramTotal(task, callback);
        return;
      }
      $ = cheerio.load(body);
      prolist = $('#channels-browse-content-grid>li');
      itct = $('#logo-container').attr('data-sessionlink') ? $('#logo-container').attr('data-sessionlink').replace(/itct=/, '') : '';
      if (prolist <= 0) {
        // this.type = '多列表';
        prolist = $('#browse-items-primary>li.feed-item-container').eq(0).find('div.feed-item-dismissable ul.shelf-content>li');
        itct = $('#browse-items-primary>li.feed-item-container').eq(0).attr('data-sessionlink').replace(/ei=/, '');
      }
      this.getProgramId(task, prolist, itct, (error, programList) => {
        programInfo.program_list = programList;
        programList = null;
        logger.debug(programInfo);
        callback();
      });
    });
  }
  getProgramId(task, proList, itct, callback) {
    const length = proList.length,
      programList = [];
    let index = 0;
    // logger.debug('---', length);
    async.whilst(
      () => index < length,
      (cb) => {
        logger.debug('222');
        this.getVideoList(task, proList.eq(index), itct, (err, program) => {
          programList.push(program);
          program = null;
          index++;
          cb();
        });
      },
      () => {
        callback(null, programList);
      }
    );
  }
  getVideoList(task, program, itct, callback) {
    const prolistId = program.find('h3.yt-lockup-title a.yt-uix-sessionlink').attr('href').replace('/playlist?list=', ''),
      option = {
        method: 'GET',
        proxy: 'http://127.0.0.1:56428',
        headers: {
          referer: `https://m.youtube.com/playlist?list=${prolistId}`,
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
        }
      },
      programData = {
        program_id: prolistId,
        program_name: program.find('h3.yt-lockup-title a.yt-uix-sessionlink').text(),
        link: `https://www.youtube.com/channel/${task.id}/playlists`,
        play_link: `https://www.youtube.com/playlist?list=${prolistId}`,
        thumbnail: program.find('.yt-lockup-thumbnail span.yt-pl-thumb .video-thumb img').attr('data-thumb'),
        video_count: program.find('div.yt-lockup-thumbnail a.yt-uix-sessionlink span.sidebar .formatted-video-count-label b').text(),
        view_count: 0,
        video_list: []
      };
    let strdata = '',
      cycle = true,
      ctoken,
      vidList,
      i;
    logger.debug('333');
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `https://m.youtube.com/playlist?ajax=1&itct=${itct}&layout=mobile&list=${prolistId}&tsp=1&utcoffset=480${strdata}`;
        req(option, (error, response, body) => {
          if (error) {
            logger.debug('专辑列表请求错误', error);
            cb();
            return;
          }
          if (response.statusCode !== 200) {
            logger.debug('专辑列表请求状态错误', response.statusCode);
            cb();
            return;
          }
          try {
            body = JSON.parse(body.replace(/\)\]\}'/, ''));
          } catch (e) {
            logger.debug('专辑列表数据解析失败', body);
            cb();
            return;
          }
          if (!strdata) {
            programData.view_count = this._num(body.content.playlist_header.view_count_text.runs[0].text);
            vidList = body.content.section_list.contents[0].contents[0].contents;
            ctoken = body.content.section_list.contents[0].contents[0].continuations[0] ? body.content.section_list.contents[0].contents[0].continuations[0].continuation : null;
          } else {
            vidList = body.content.continuation_contents.contents;
            ctoken = body.content.continuation_contents.continuations[0] ? body.content.continuation_contents.continuations[0].continuation : null;
          }
          for (i = 0; i < vidList.length; i++) {
            programData.video_list.push(vidList[i].video_id);
          }
          if (!ctoken) {
            cycle = false;
          }
          strdata = `&ctoken=${ctoken}&action_continuation=1`;
          logger.debug('444');
          cb();
        });
      },
      () => {
        callback(null, programData);
      }
    );
  }
  _num(str) {
    if (!str) {
      return '';
    }
    if (typeof str === 'string') {
      str = str.replace(/,/g, '');
      str = str.match(/ \d*/).toString();
      return Number(str);
    }
  }
}
module.exports = getProgram;