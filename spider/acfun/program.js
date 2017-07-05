const async = require('neo-async');
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
      url: `${this.settings.spiderAPI.acfun.programList + task.id}&pageNo=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('acfun栏目总数请求失败');
        this.getProgramTotal(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('acfun栏目数据解析失败');
        logger.info(result);
        this.getProgramTotal(task, callback);
        return;
      }
      const proTotal = result.data.page.totalCount;
      this.getProgramList(task, proTotal, () => {
        callback();
      });
    });
  }
  getProgramList(task, proTotal, callback) {
    const option = {},
      programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      };
    let pg = 1,
      page = 2;
    if (proTotal % 20 === 0) {
      page = proTotal / 20;
    } else {
      page = Math.ceil(proTotal / 20);
    }
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `${this.settings.spiderAPI.acfun.programList + task.id}&pageNo=${pg}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('栏目列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('栏目列表解析失败');
            logger.info(result);
            cb();
            return;
          }
          result = result.data.page.list;
          this.getProgramId(task, result, (error, lists) => {
            for (const value of lists) {
              programInfo.program_list.push(value);
            }
            pg += 1;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  getProgramId(task, proList, callback) {
    const length = proList.length,
      programList = [];
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getVideoList(proList[index], (err, programData) => {
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
    const option = {},
      programData = {
        video_list: []
      };
    let pg = 1,
      page = 2,
      index;
    if (program.contentSize % 20 === 0) {
      page = program.contentSize / 20;
    } else {
      page = Math.ceil(program.contentSize / 20);
    }
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `http://api.aixifan.com/albums/${program.specialId}/contents?page={"num":${pg},"size":20}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('专辑列表请求失败');
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('专辑列表解析失败');
            logger.info(result);
            cb();
            return;
          }
          result = result.data.list;
          for (index = 0; index < result.length; index += 1) {
            programData.video_list.push(result[index].contentId);
          }
          pg += 1;
          cb();
        });
      },
      () => {
        programData.program_id = program.specialId;
        programData.program_name = program.title;
        programData.link = `http://www.acfun.cn/a/aa${program.specialId}`;
        programData.play_link = '';
        programData.thumbnail = program.cover;
        programData.video_count = program.contentSize;
        programData.view_count = program.views;
        programData.published = program.releaseDate.toString().substring(0, 10);
        callback(null, programData);
      }
    );
  }
}
module.exports = getProgram;