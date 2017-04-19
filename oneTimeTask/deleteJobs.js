const request = require('request');
const async = require('async');

if (!process.argv[2] || !process.argv[3]) {
  throw new Error('缺少参数');
}
const p = process.argv[2];
const status = process.argv[3];
const a = function (callback) {
  request.get(`http://spider-kue.meimiaoip.com/api/jobs/${p}/${status}/0..100/asc?`, { auth: { user: 'verona', pass: '2319446' } }, (err, res, body) => {
    if (err) {
      console.log(err);
      return callback(err);
    }
    if (res.statusCode !== 200) {
      return callback(true);
    }
    let result;
    try {
      result = JSON.parse(body);
    } catch (e) {
      return callback(e);
    }
    callback(null, result);
  });
};
const b = function (list, callback) {
  const c = function (item, cb) {
    request.delete(`http://spider-kue.meimiaoip.com/api/job/${item.id}`, { auth: { user: 'verona', pass: '2319446' } }, (err, res, body) => {
      if (err) {
        return cb(err);
      }
      if (res.statusCode !== 200) {
        return cb(true);
      }
      let result;
      try {
        result = JSON.parse(body);
      } catch (e) {
        return cb(e);
      }
      cb(null, result);
    });
  };
  async.map(list, c, (err, results) => callback(null, results));
};
async.waterfall([
  (callback) => {
    a((err, result) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, result);
    });
  },
  (list, callback) => {
    b(list, (err, info) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, info);
    });
  }
], (err, result) => {
  console.log(result);
});