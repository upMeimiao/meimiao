const Redis = require('ioredis');
const async = require('async');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/2', {
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
    }
  );
}
redis.keys('c:*', (err, result) => {
  loop(result);
});