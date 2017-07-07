/**
 * Created by penghui on 2017/4/27.
 */
const URL = require('url');
const async = require('neo-async');
const cheerio = require('cheerio');
const request = require('../../lib/request');

const jsonp = data => data;

let logger;
class getProgram {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('getProgram instantiation ...');
  }
  start(task, callback) {
    this.getProgramTotal(task, () => {
      callback();
    });
  }
  getProgramTotal(task, callback) {
    const option = {
        url: `http://boke.ku6.com/${task.id}?mode=2&view=2`
      },
      programInfo = {
        platform: task.id,
        bid: task.bid,
        program_list: []
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('ku6栏目总数请求失败',err);
        this.getProgramTotal(task, callback);
        return;
      }
      const $ = cheerio.load(result.body),
        proList = $('div.listContent>div.ku6_box');
      this.getProgramList(task, proList, (error, list) => {
        programInfo.program_list = list;
        callback();
      });
    });
  }
  getProgramList(task, proList, callback) {
    const length = proList.length,
      programList = [];
    let index = 3;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getVideoList(task, proList.eq(index), (err, programData) => {
          programList.push(programData);
          programData = null;
          index++;
          cb();
        });
      },
      () => {
        logger.debug(programList)
        callback(null, programList);
      }
    );
  }

  getVideoList(task, program, callback) {
    const option = {
        url: program.find('div.fleft>a').attr('href')
      },
      programData = {};
    let total = 0,
      video_list = [],
      str = '';
    if (program.find('div.fright div.layer1 strong').text() === 0) {
      programData.program_id = URL.parse(program.find('.fleft>a').attr('href'), true).query.li;
      programData.program_name = program.find('.fleft>a h4').text();
      programData.link = program.find('.fleft>a').attr('href');
      programData.play_link = '';
      programData.thumbnail = '';
      programData.video_count = 0;
      programData.view_count = 0;
      programData.published = '';
      programData.video_list = [];
      callback(null, programData);
      return;
    }
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('专辑列表请求失败');
        this.getVideoList(task, program, callback);
        return;
      }
      const $ = cheerio.load(result.body),
        vidList = $('#PlayList>li');
      total = $('div.tRight>span').text();
      for (let i = 0; i < vidList.length; i += 1) {
        video_list.push(vidList.eq(i).find('a.list .views .need_playtimes').attr('data-vid'));
        str += `|${vidList.eq(i).find('a.list .views .need_playtimes').attr('data-vid')}`;
      }
      this.getPlayCount(str.replace('|', ''), (error, playNum) => {
        programData.program_id = URL.parse(program.find('.fleft>a').attr('href'), true).query.li;
        programData.program_name = program.find('.fleft>a h4').text();
        programData.link = program.find('.fleft>a').attr('href');
        programData.play_link = '';
        programData.thumbnail = program.find('.fright .pic5 img').eq(0).attr('src');
        programData.video_count = total;
        programData.view_count = playNum;
        programData.published = '';
        programData.video_list = video_list;
        video_list = [];
        callback(null, programData);
      });
    });
  }
  getPlayCount(str, callback) {
    const option = {
      url: `http://v7.stat.ku6.com/dostatv.do?method=getVideoPlayCount&n=gotPlayCounts&v=${str}&cp=0`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('播放量获取失败');
        this.getPlayCount(str, callback);
        return;
      }
      result = result.body.replace("document.domain='ku6.com';(function(){var d=", 'jsonp({dataJson:{data:').replace(';gotPlayCounts(d,0);})()', '}})');
      let count = 0;
      try {
        result = eval(result);
      } catch (e) {
        logger.info(result);
      }
      for (let i = 0; i < result.dataJson.data.length; i += 1) {
        count += parseInt(result.dataJson.data[i].count, 10);
      }
      callback(null, count);
    });
  }
}
module.exports = getProgram;