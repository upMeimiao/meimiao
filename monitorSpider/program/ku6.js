/**
 * Created by zhupenghui on 2017/7/17.
 */
let async, request, logger, typeErr, infoCheck, URL, cheerio;
class program {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    async = core.modules.async;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    cheerio = core.modules.cheerio;
    URL = core.modules.URL;
    logger = core.settings.logger;
    logger.trace('ku6 program instantiation ...');
  }
  start(task, callback) {
    this.getProgramList(task, () => {
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
      url: `http://boke.ku6.com/${task.id}?mode=2&view=2`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      const $ = cheerio.load(result.body),
        proList = $('div.listContent>div.ku6_box');
      if (proList.length <= 3) {
        callback();
        return;
      }
      if (!proList || !proList.length) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify('ku6-DOM结构异常')}}`, interface: 'proList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      this.programIdlist(task, proList.eq(0));
      callback();
      option = null; result = null;  typeErr = null;
    });
  }
  programIdlist(task, program) {
    let option = {
        url: program.find('div.fleft>a').attr('href')
      },
      total = 0;
    request.get(logger, option, (err, result) => {
     if (err) {
       if (err.status && err.status !== 200) {
         typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proIdList', url: option.url};
         infoCheck.interface(this.core, task, typeErr);
       } else {
         typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proIdList', url: option.url};
         infoCheck.interface(this.core, task, typeErr);
       }
       return;
     }
     const $ = cheerio.load(result.body),
        vidList = $('#PlayList>li');
     total = $('div.tRight>span').text();
     if (total === 0) {
       return;
     }
     if (!total && !vidList.length) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'proIdList', url: option.url};
       infoCheck.interface(this.core, task, typeErr);
     }
     option = null; result = null; typeErr = null;
    });
  }
}
module.exports = program;

