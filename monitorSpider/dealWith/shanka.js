/**
 * Created by zhupenghui on 17/7/12.
 */
let logger, typeErr, request, infoCheck, async;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    async = core.modules.async;
    logger = this.settings.logger;
    logger.trace('shanka monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
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
      url: `${this.settings.spiderAPI.shanka.list}{"attach_info":"","type":"1","person_id":"${task.id}"}`,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
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
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'error', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (Number(result.ret) !== 0 || !result.data || !result.data.feeds.length) {
        typeErr = {type: 'data', err: `shanka-粉丝数不存在或者视频列表有问题, data: ${JSON.stringify(result)}`, interface: 'user(list)', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null;
      typeErr = null;
    });
  }
}
module.exports = dealWith;