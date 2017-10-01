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
    logger.trace('ku6 program instantiation ...');
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.cheerio = this.modules.cheerio;
    this.getProgramList(task, () => {
      task = null;
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
      url: `http://boke.ku6.com/${task.id}?mode=2&view=2`
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
        option = null; task = null; result = null; typeErr = null;
        callback();
        return;
      }
      let $ = task.cheerio.load(result.body),
        proList = $('div.listContent>div.ku6_box');
      if (proList.length <= 3) {
        option = null; task = null; result = null; typeErr = null; $ = null; proList = null;
        callback();
        return;
      }
      if (!proList || !proList.length) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify('ku6-DOM结构异常')}}`, interface: 'proList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        callback();
        return;
      }
      this.programIdlist(task, proList.eq(0));
      callback();
      option = null; result = null;  typeErr = null; task = null;
    });
  }
  programIdlist(task, program) {
    let option = {
        url: program.find('div.fleft>a').attr('href')
      },
      total = 0;
    task.request.get(logger, option, (err, result) => {
     if (err) {
       if (err.status && err.status !== 200) {
         typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proIdList', url: JSON.stringify(option)};
         task.infoCheck.interface(task.core, task, typeErr);
       } else {
         typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proIdList', url: JSON.stringify(option)};
         task.infoCheck.interface(task.core, task, typeErr);
       }
       option = null; task = null; result = null; typeErr = null;
       return;
     }
     let $ = task.cheerio.load(result.body),
        vidList = $('#PlayList>li');
     total = $('div.tRight>span').text();
     if (total === 0) {
       option = null; task = null; result = null; typeErr = null; $ = null; vidList = null; total = null;
       return;
     }
     if (!total && !vidList.length) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       task.infoCheck.interface(task.core, task, typeErr);
     }
     option = null; result = null; typeErr = null; task = null; $ = null; vidList = null;
    });
  }
}
module.exports = program;

