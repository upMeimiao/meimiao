/**
 * Created by zhupenghui on 17/6/19.
 */

let logger, typeErr, async, request, infoCheck, crypto;
const getHoney = (md5) => {
  const hash = md5.createHash('md5');
  const t = Math.floor((new Date()).getTime() / 1e3),
    e = t.toString(16).toUpperCase(),
    n = hash.update(t.toString()).digest('hex').toUpperCase();
  if (e.length !== 8) {
    return {
      as: '479BB4B7254C150',
      cp: '7E0AC8874BB0985'
    };
  }
  let o, l, i, a, r, s;
  for (o = n.slice(0, 5), i = n.slice(-5), a = '', r = 0; r < 5; r += 1) a += o[r] + e[r];
  for (l = '', s = 0; s < 5; s += 1) l += e[s + 3] + i[s];
  return {
    as: `A1${a}${e.slice(-3)}`,
    cp: `${e.slice(0, 3) + l}E1`
  };
};
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    async = core.modules.async;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    crypto = core.modules.crypto;
    logger = this.settings.logger;
    logger.trace('toutiao monitor begin...');
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
      url: this.settings.spiderAPI.toutiao.user + task.encodeId,
      ua: 3,
      own_ua: 'News/5.9.5 (iPhone; iOS 10.2; Scale/3.00)'
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
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.message !== 'success' || !result.data) {
        typeErr = {type: 'data', err: `toutiao-user-data-error, data: ${JSON.stringify(result)}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      let fans = result.data.total_cnt;
      if (Number(fans) === 0 && result.data.users.length !== 0) {
        typeErr = {type: 'data', err: `toutiao-fans-data-error, data: ${JSON.stringify(result)}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  list(task) {
    let { as, cp } = getHoney(crypto),
      option = {
        ua: 3,
        own_ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92 NewsArticle/5.9.5.4 JsSdk/2.0 NetType/WIFI (News 5.9.5 10.200000)',
        url: `http://ic.snssdk.com${this.settings.spiderAPI.toutiao.newList}${task.mapBid}&cp=${cp}&as=${as}&max_behot_time=`
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          if (err.status >= 500) {
            typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
            infoCheck.interface(this.core, task, typeErr);
          }
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        this.list(task);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result || result.length === 0) {
        typeErr = {type: 'data', err: `toutiao-list-data-null, data: ${JSON.stringify(result)}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null; cp = null; as = null;
    });
  }
}
module.exports = dealWith;