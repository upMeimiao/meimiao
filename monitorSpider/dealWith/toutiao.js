/**
 * Created by zhupenghui on 17/6/19.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');
const crypto = require('crypto');

const getHoney = () => {
  const hash = crypto.createHash('md5');
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
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('toutiao monitor begin...');
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb();
          })
        },
        list: (cb) => {
          this.list(task, 0, () => {
            cb();
          });
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task, callback) {
    const options = {
      url: this.settings.spiderAPI.toutiao.user + task.encodeId,
      ua: 3,
      own_ua: 'News/5.9.5 (iPhone; iOS 10.2; Scale/3.00)'
    };
    request.get(logger, options, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    })
  }
  list(task, times, callback) {
    if (times >= 3) {
      callback();
      return;
    }
    const { as, cp } = getHoney(),
      option = {
        ua: 3,
        own_ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92 NewsArticle/5.9.5.4 JsSdk/2.0 NetType/WIFI (News 5.9.5 10.200000)',
        url: `http://ic.snssdk.com${this.settings.spiderAPI.toutiao.newList}${task.mapBid}&cp=${cp}&as=${as}&max_behot_time=`
      };
    this.core.proxy.getProxy(0, (err, proxy) => {
      if (err) {
        callback();
        return;
      }
      if (proxy === 'timeout') {
        callback();
        return;
      }
      option.proxy = proxy;
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
          this.list(task, times + 1, callback);
          this.core.proxy.back(proxy, false);
          return;
        }
        times = 0;
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
          callback();
          return;
        }
        if (!result || result.length === 0) {
          typeErr = {type: 'data', err: 'toutiao-list-data-null', interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        // this.deal(task, result.data);
        callback();
      });
    });
  }
}
module.exports = dealWith;