const Redis = require('ioredis');
const async = require('async');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/3', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});
function delkey(key, callback) {
  redis.del(key, () => {
    callback();
  });
}
function loop(info) {
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
      redis.quit();
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
redis.keys('c:*', (err, result) => {
  loop(result);
});
// redis.scan('0', 'MATCH', 'c:*', 'COUNT', '2000', (err, result) => {
//   loop(result[1]);
// });