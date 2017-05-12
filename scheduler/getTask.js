const request = require('request');
const async = require('neo-async');

const getTask = (url, callback) => {
  async.parallel({
    // youku: (cb) => {
    //   request(`${url}1`, (err, res, body) => {
    //     if (err || res.statusCode !== 200) {
    //       cb('error');
    //     }
    //     body = JSON.parse(body);
    //     cb(null, body.data);
    //   });
    // },
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
    acfun: (cb) => {
      request(`${url}22`, (err, res, body) => {
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
      const raw = []// .concat(results.youku)
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
        .concat(results.acfun);
      callback(null, raw);
    }
  });
};
exports.getTask = getTask;