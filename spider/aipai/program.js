/**
 * Created by zhupenghui on 2017/7/4.
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
      url: `http://home.aipai.com/${task.id}?action=album&catagory=albumList&page=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('爱拍原创栏目总数请求失败');
        this.getProgramTotal(task, callback);
        return;
      }
      const $ = cheerio.load(result.body),
        total = Number($('div.hd h6 strong').text().replace(/,/g, '')),
        page = total % 9 === 0 ? total / 9 : Math.ceil(total / 9);
      this.getProgramList(task, page, () => {
        callback();
      });
    });
  }
  getProgramList(task, page, callback) {
    let pg = 1;
    const option = {
        ua: 1
      },
      programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      };
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `http://home.aipai.com/${task.id}?action=album&catagory=albumList&page=${pg}`;
        // logger.debug(option.url);
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('栏目列表请求失败', err);
            cb();
            return;
          }
          const $ = cheerio.load(result.body),
            proList = $('.zhuanji_list>ul.wrapfix>li');
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
    const length = proList.length;
    let index = 0,
      programList = [];
    async.whilst(
      () => index < length,
      (cb) => {
        this.getVideoList(task, proList.eq(index), (err, programData) => {
          programList.push(programData);
          programData = null;
          index += 1;
          cb();
        });
      },
      () => {
        callback(null, programList);
        programList = null;
      }
    );
  }
  getVideoList(task, program, callback) {
    const listId = program.find('a.pic').attr('href').match(/id=(\d*)/)[1],
      option = {
        ua: 1
      },
      countVid = Number(program.find('p>span.zp').text().replace(/,/g, '')),
      total = countVid % 12 === 0 ? countVid / 12 : Math.ceil(countVid / 12),
      time = new Date(`${program.find('span.time').text()} 00:00:00`);
    let page = 1,
      programData = {
        video_list: [],
        view_count: 0
      };
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `http://www.aipai.com/space.php?catagory=workList&action=album&bid=${task.id}&id=${listId}&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('专辑列表请求失败');
            cb();
            return;
          }
          const $ = cheerio.load(result.body),
            vidlist = $('div.video_list>ul');
          let video;
          for (let i = 0; i < vidlist.length; i += 1) {
            video = vidlist.eq(i).find('li');
            for (let j = 0; j < video.length; j += 1) {
              programData.video_list.push(video.eq(j).find('a.pic>img').attr('src').match(/(\d*)_big/)[1]);
              programData.view_count = Number(programData.view_count) + Number(video.eq(j).find('p span.rq').text().replace(/,/g, ''));
            }
          }
          page += 1;
          cb();
        });
      },
      () => {
        programData.program_id = listId;
        programData.program_name = program.find('h5 a').attr('title');
        programData.link = program.find('h5 a').attr('href');
        programData.thumbnail = program.find('a>img').attr('src');
        programData.video_count = countVid;
        programData.published = moment(time).format('X');
        callback(null, programData);
        programData = null;
      }
    );
  }
}
module.exports = getProgram;
