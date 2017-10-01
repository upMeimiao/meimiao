/**
 * Created by penghui on 2017/4/27.
 */
const async = require('neo-async');
const moment = require('moment');
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
      url: `${this.settings.spiderAPI.tencent.programList + task.id}&pagenum=1&_${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('腾讯栏目总数请求失败');
        this.getProgramTotal(task, callback);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('腾讯栏目数据解析失败');
        logger.info(result);
        this.getProgramTotal(task, callback);
        return;
      }
      const proTotal = result.foldertotal;
      this.getProgramList(task, proTotal, () => {
        callback();
      });
    });
  }
  getProgramList(task, proTotal, callback) {
    let pg = 1,
      page = 2;
    const option = {},
      programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      };
    if (proTotal % 20 === 0) {
      page = proTotal / 20;
    } else {
      page = Math.ceil(proTotal / 20);
    }
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `${this.settings.spiderAPI.tencent.programList + task.id}&pagenum=${pg}&_${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('栏目列表请求失败', err);
            cb();
            return;
          }
          try {
            result = eval(result.body);
          } catch (e) {
            logger.debug('栏目列表解析失败');
            logger.info(result);
            cb();
            return;
          }
          result = result.folderlist;
          this.getProgramId(task, result, (error, list) => {
            for (const value of list) {
              programInfo.program_list.push(value);
            }
            list = null;
            pg++;
            cb();
          });
        });
      },
      () => {
        logger.debug(programInfo);
        callback();
      }
    );
  }
  getProgramId(task, proList, callback) {
    let index = 0;
    const length = proList.length,
      programList = [];
    async.whilst(
      () => index < length,
      (cb) => {
        this.getVideoList(task, proList[index], (err, programData) => {
          programList.push(programData);
          programData = null;
          index++;
          cb();
        });
      },
      () => {
        callback(null, programList);
      }
    );
  }
  getVideoList(task, program, callback) {
    let pg = 1,
      page = 2;
    const time = new Date(program.ctime),
      programData = {
        program_id: program.cid,
        program_name: program.title,
        link: `http://v.qq.com/vplus/ergeng/foldervideos/${program.cid}`,
        thumbnail: program.pic,
        video_count: program.video_count,
        view_count: this.playNum(program.play_count),
        published: moment(time).format('X'),
        video_list: []
      },
      option = {};
    if (program.video_count % 30 === 0) {
      page = program.video_count / 30;
    } else {
      page = Math.ceil(program.video_count / 30);
    }
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `${this.settings.spiderAPI.tencent.proVideoList + task.id}&cid=${program.cid}&pagenum=${pg}&_${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('专辑列表请求失败');
            cb();
            return;
          }
          try {
            result = eval(result.body);
          } catch (e) {
            logger.debug('专辑列表解析失败');
            logger.info(result);
            cb();
            return;
          }
          result = result.videolst;
          for (let i = 0; i < result.length; i++) {
            programData.video_list.push(result[i].vid);
          }
          pg++;
          cb();
        });
      },
      () => {
        // logger.debug(programData);
        callback(null, programData);
      }
    );
  }
  playNum(count) {
    if (count.indexOf('万') !== -1) {
      return count.replace('.', '').replace('万', '000');
    }
    return count;
  }
}
module.exports = getProgram;