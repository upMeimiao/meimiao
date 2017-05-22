const Redis = require('ioredis');
const async = require('async');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e970ad613f13a4.redis.rds.aliyuncs.com:6379/1', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});
function delkey(key, callback) {
  redis.del(key, () => {
    callback();
  });
}
function loop(info, callback) {
  let i = 0;
  const len = info.length;
  async.whilst(
    () => i < len,
    (cb) => {
      delkey(info[i], () => {
        i += 1;
        cb();
      });
    },
    () => {
      console.log('end');
      callback();
      // redis.quit();
      // redis.scan('0', 'MATCH', 'c:*', 'COUNT', '2000', (err, result) => {
      //   if (result.length === 0) {
      //     console.log('end');
      //     redis.quit();
      //   } else {
      //     loop(result[1]);
      //   }
      // });
    }
  );
}
// redis.keys('c:*', (err, result) => {
//   loop(result);
// });
const start = (k) => {
  redis.scan(k, 'MATCH', 'c:*', 'COUNT', '2000', (err, result) => {
    loop(result[1], () => {
      start(result[0]);
    });
  });
};
start(0);