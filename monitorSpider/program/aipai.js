/**
 * Created by zhupenghui on 2017/7/17.
 */
let async, request, cheerio, logger, typeErr, infoCheck;
class program {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    async = core.modules.async;
    request = core.modules.request;
    cheerio = core.modules.cheerio;
    infoCheck = core.modules.infoCheck;
    logger = core.settings.logger;
    logger.trace('aipai program instantiation ...');
  }
  start(task, callback) {
    this.getProgramList(task, () => {
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
      url: `http://home.aipai.com/${task.id}?action=album&catagory=albumList&page=1`
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
        total = Number($('div.hd h6 strong').text().replace(/,/g, '')),
        proList = $('.zhuanji_list>ul.wrapfix>li');
      if (total === 0) {
        callback();
        return;
      }
      if (!proList.length || !total) {
        typeErr = {type: 'data', err: `栏目Dom结构出问题: ${JSON.stringify(total)}}`, interface: 'proList', url: option.url};
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
    let listId = program.find('a.pic').attr('href').match(/id=(\d*)/)[1],
      option = {
        url: `http://www.aipai.com/space.php?catagory=workList&action=album&bid=${task.id}&id=${listId}&page=1`,
        ua: 1
      };
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
        vidlist = $('div.video_list>ul');
      if (!vidlist.length) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify('dom结构出错')}}`, interface: 'proIdList', url: option.url};
       infoCheck.interface(this.core, task, typeErr);
     }
     option = null; result = null; typeErr = null;
    });
  }
}
module.exports = program;

