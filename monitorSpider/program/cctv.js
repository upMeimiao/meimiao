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
    logger.trace('cctv program instantiation ...');
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
      url: `http://my.xiyou.cctv.com/${task.id}/plist-1-1.html`
    };
    task.request.get(logger, option, (err,result) => {
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
        prolist = $('#tab_list_02_0>div.zhuanjilAind_2013041003>div.imagetext');
      if (prolist.length === 0) {
        option = null; task = null; result = null; typeErr = null; $ = null; prolist = null;
        callback();
        return;
      }
      if (!prolist.length) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify('DOM结构可能有问题')}}`, interface: 'proList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null; $ = null; prolist = null;
        callback();
        return;
      }
      const proid = prolist.eq(0).find('div.img>a').attr('href').match(/p-(\d*)/)[1];
      this.programIdlist(task, proid);
      callback();
      option = null; result = null;  typeErr = null; $ = null; prolist = null; task = null;
    });
  }
  programIdlist(task, proId) {
    let option = {
      url: `http://xiyou.cctv.com/${proId}-1.html`
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
        vidlist = $('ul.videolist>li').not('.clear');
      if (vidlist.length !== 0 && !vidlist.length) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify('单个专辑的DOM结构有问题')}}`, interface: 'proIdList', url: JSON.stringify(option)};
       task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null; $ = null; vidlist = null;
    });
  }
}
module.exports = program;

