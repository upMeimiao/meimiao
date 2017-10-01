/**
 * Created by penghui on 2017/4/26.
 */
const async = require('neo-async');
const cheerio = require('cheerio');
const moment = require('moment');
const request = require('../../lib/request');

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
      url: `http://my.xiyou.cctv.com/${task.id}/plist-1-1.html`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('CCTV栏目总数请求失败');
        this.getProgramTotal(task, callback);
        return;
      }
      const $ = cheerio.load(result.body);
      let page = $('div.pagetotal span').eq(1).text().replace('共', '').replace('页', '').replace(/\s/g, '');
      if (page === '') {
        page = 1;
      }
      this.getProgramList(task, page, () => {
        callback();
      });
    });
  }
  getProgramList(task, page, callback) {
    let pg = 1;
    const option = {},
      programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      };
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `http://my.xiyou.cctv.com/${task.id}/plist-1-${pg}.html`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('栏目列表请求失败', err);
            cb();
            return;
          }
          const $ = cheerio.load(result.body),
            proList = $('#tab_list_02_0 div.imagetext');
          this.getProgramId(task, proList, (error, list) => {
            for (const value of list) {
              programInfo.program_list.push(value);
            }
            list = null;
            pg += 1;
            cb();
          });
        });
      },
      () => {
        logger.info(programInfo);
        callback();
      }
    );
  }
  getProgramId(task, proList, callback) {
    const programList = [],
      length = proList.length;
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getVideoList(proList.eq(index), (err, programData) => {
          programList.push(programData);
          programData = null;
          index += 1;
          cb();
        });
      },
      () => {
        callback(null, programList);
      }
    );
  }
  getVideoList(program, callback) {
    const listId = program.find('div.img>a').attr('href').match(/p-\d*/).toString(),
      option = {},
      countVid = program.find('div.text p').eq(1).text().replace(/[共个视频]/g, '');
    const programData = {
      video_list: [],
      view_count: 0
    };
    let pg = 1,
      page = 2,
      time = null;
    if (countVid % 20 === 0) {
      page = countVid / 20;
    } else {
      page = Math.ceil(countVid / 20);
    }
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `http://xiyou.cctv.com/${listId}-${pg}.html`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('专辑列表请求失败');
            cb();
            return;
          }
          const $ = cheerio.load(result.body),
            vidlist = $('ul.videolist>li').not('.clear');
          time = new Date(`${$('div.zjinfo p.pt10 .pr10').text()} 00:00:00`);
          for (let i = 0; i < vidlist.length; i += 1) {
            programData.video_list.push(vidlist.eq(i).find('p.v_pic span.vadd').attr('id'));
            programData.view_count += parseInt(vidlist.eq(i).find('p.v_txt span.v_mun').eq(0).text().replace(/,/g, ''));
          }
          pg += 1;
          cb();
        });
      },
      () => {
        programData.program_id = listId;
        programData.program_name = program.find('div.text>p a').attr('title');
        programData.link = program.find('div.text>p a').attr('href');
        programData.thumbnail = program.find('div.img img').attr('src');
        programData.video_count = countVid;
        programData.published = moment(time).format('X');
        callback(null, programData);
      }
    );
  }
}
module.exports = getProgram;