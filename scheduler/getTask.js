const request = require('request');
const async = require('neo-async');

const getTask = (url, callback) => {
  async.parallel({
    youku: (cb) => {
      request(`${url}1`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    iqiyi: (cb) => {
      request(`${url}2`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    le: (cb) => {
      request(`${url}3`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    tencent: (cb) => {
      request(`${url}4`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    meipai: (cb) => {
      request(`${url}5`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    toutiao: (cb) => {
      request(`${url}6`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    miaopai: (cb) => {
      request(`${url}7`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    bili: (cb) => {
      request(`${url}8`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    sohu: (cb) => {
      request(`${url}9`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    kuaibao: (cb) => {
      request(`${url}10`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    yidian: (cb) => {
      request(`${url}11`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    tudou: (cb) => {
      request(`${url}12`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    baomihua: (cb) => {
      request(`${url}13`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    ku6: (cb) => {
      request(`${url}14`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    btime: (cb) => {
      request(`${url}15`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    weishi: (cb) => {
      request(`${url}16`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    xiaoying: (cb) => {
      request(`${url}17`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    budejie: (cb) => {
      request(`${url}18`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    neihan: (cb) => {
      request(`${url}19`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    yy: (cb) => {
      request(`${url}20`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    tv56: (cb) => {
      request(`${url}21`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    acfun: (cb) => {
      request(`${url}22`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    weibo: (cb) => {
      request(`${url}23`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    ifeng: (cb) => {
      request(`${url}24`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    wangyi: (cb) => {
      request(`${url}25`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    uctt: (cb) => {
      request(`${url}26`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    mgtv: (cb) => {
      request(`${url}27`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    baijia: (cb) => {
      request(`${url}28`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    qzone: (cb) => {
      request(`${url}29`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    cctv: (cb) => {
      request(`${url}30`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    pptv: (cb) => {
      request(`${url}31`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    xinlan: (cb) => {
      request(`${url}32`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    v1: (cb) => {
      request(`${url}33`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    fengxing: (cb) => {
      request(`${url}34`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    huashu: (cb) => {
      request(`${url}35`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    baofeng: (cb) => {
      request(`${url}36`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    baidu: (cb) => {
      request(`${url}37`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    li: (cb) => {
      request(`${url}38`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    youtube: (cb) => {
      request(`${url}39`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    facebook: (cb) => {
      request(`${url}40`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    renren: (cb) => {
      request(`${url}41`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
    dianshi: (cb) => {
      request(`${url}42`, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb('error');
        }
        body = JSON.parse(body);
        cb(null, body.data);
      });
    },
  }, (err, results) => {
    if (err) {
      callback(err);
    } else {
      const raw = [].concat(results.youku)
        .concat(results.iqiyi)
        .concat(results.le)
        .concat(results.tencent)
        .concat(results.meipai)
        .concat(results.toutiao)
        .concat(results.miaopai)
        .concat(results.bili)
        .concat(results.sohu)
        .concat(results.kuaibao)
        .concat(results.yidian)
        .concat(results.tudou)
        .concat(results.baomihua)
        .concat(results.ku6)
        .concat(results.btime)
        .concat(results.weishi)
        .concat(results.xiaoying)
        .concat(results.budejie)
        .concat(results.neihan)
        .concat(results.yy)
        .concat(results.tv56)
        .concat(results.acfun)
        .concat(results.weibo)
        .concat(results.ifeng)
        .concat(results.wangyi)
        .concat(results.uctt)
        .concat(results.mgtv)
        .concat(results.baijia)
        .concat(results.qzone)
        .concat(results.cctv)
        .concat(results.pptv)
        .concat(results.xinlan)
        .concat(results.v1)
        .concat(results.fengxing)
        .concat(results.huashu)
        .concat(results.baofeng)
        .concat(results.baidu)
        .concat(results.li)
        .concat(results.youtube)
        .concat(results.facebook)
        .concat(results.renren)
        .concat(results.dianshi);
      callback(null, raw);
    }
  });
};
exports.getTask = getTask;