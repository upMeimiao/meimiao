/**
 * Created by zhupenghui on 17/7/12.
 */
let logger, typeErr, request, infoCheck, async, cheerio;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    async = core.modules.async;
    cheerio = core.modules.cheerio;
    logger = this.settings.logger;
    logger.trace('xiaokaxiu monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.list(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      url: `https://v.xiaokaxiu.com/u/${task.id}.html`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Upgrade-Insecure-Requests': 1
      }
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        option = null;
        typeErr = null;
        return;
      }
      const $ = cheerio.load(result.body),
        fans_num = $('div.uk-grid.uk-grid-collapse.uk-text-center>div').eq(2).text().replace('粉丝', '');
      if (fans_num == '') {
        typeErr = {type: 'data', err: 'xiaokaxiu-粉丝数不存在或者本次请求异常', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      typeErr = null;
    });
  }
  list(task) {
    let option = {
      url: `${this.settings.spiderAPI.xiaokaxiu.list + task.id}&page=1`,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        Referer: `https://v.xiaokaxiu.com/u/${task.id}.html`
      }
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        option = null;
        typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        option = null;
        typeErr = null;
        return;
      }
      if(Number(result.result) !== 1 || !result.data || !result.data.list.length) {
        typeErr = {type: 'data', err: '小咖秀-视频列表出现异常', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      this.video(task, result.data.list[0].scid);
      option = null;
      typeErr = null;
    });
  }
  video(task, scid) {
    let option = {
      url: `https://v.xiaokaxiu.com/v/${scid}.html`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      const $ = cheerio.load(result.body),
        ding = $('div.uk-grid.uk-grid-collapse.uk-text-center>div').eq(0).find('span').text(),
        comment = $('div.uk-grid.uk-grid-collapse.uk-text-center>div').eq(1).find('span').text();
      if (!ding || !comment) {
        typeErr = {type: 'data', err: 'xiaokaxiu-单视频信息出现异常', interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      result = null;
    });
  }
}
module.exports = dealWith;