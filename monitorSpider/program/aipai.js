/**
 * Created by zhupenghui on 2017/7/17.
 */
let logger, typeErr;
class program {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = core.settings.logger;
    logger.trace('aipai program instantiation ...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.cheerio = this.modules.cheerio;
    task.infoCheck = this.modules.infoCheck;
    this.getProgramList(task, () => {
      task = null;
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
      url: `http://home.aipai.com/${task.id}?action=album&catagory=albumList&page=1`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      let $ = task.cheerio.load(result.body),
        total = Number($('div.hd h6 strong').text().replace(/,/g, '')),
        proList = $('.zhuanji_list>ul.wrapfix>li');
      if (total === 0) {
        option = null; result = null; task = null; typeErr = null; $ = null; total = null; proList = null;
        callback();
        return;
      }
      if (!proList.length || !total) {
        typeErr = {type: 'data', err: `栏目Dom结构出问题: ${JSON.stringify(total)}}`, interface: 'proList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null; $ = null; total = null; proList = null;
        callback();
        return;
      }
      this.programIdlist(task, proList.eq(0));
      callback();
      option = null; result = null; task = null; typeErr = null; $ = null; total = null; proList = null;
    });
  }
  programIdlist(task, program) {
    let listId = program.find('a.pic').attr('href').match(/id=(\d*)/)[1],
      option = {
        url: `http://www.aipai.com/space.php?catagory=workList&action=album&bid=${task.id}&id=${listId}&page=1`,
        ua: 1
      };
    task.request.get(logger, option, (err, result) => {
     if (err) {
       if (err.status && err.status !== 200) {
         typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proIdList', url: JSON.stringify(option)};
         task.infoCheck.interface(task.core, task, typeErr);
       } else {
         typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proIdList', url: JSON.stringify(option)};
         task.infoCheck.interface(task.core, task, typeErr);
       }
       option = null; result = null; task = null; typeErr = null;
       return;
     }
      let $ = task.cheerio.load(result.body),
        vidlist = $('div.video_list>ul');
      if (!vidlist.length) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify('dom结构出错')}}`, interface: 'proIdList', url: JSON.stringify(option)};
       task.infoCheck.interface(task.core, task, typeErr);
     }
      option = null; result = null; task = null; typeErr = null; $ = null; vidlist = null;
    });
  }
}
module.exports = program;

