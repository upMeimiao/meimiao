const Redis = require('ioredis');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e970ad613f13a4.redis.rds.aliyuncs.com:6379/3', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});
exports.do = (io, socket) => {
  const queryMemory = () => {
    redis.info('memory', (err, result) => {
      const memory = {}
      for (const [index, elem] of result.split('\r\n').entries()) {
        if (index !== 0 && elem !== '') {
          memory[elem.split(':')[0]] = elem.split(':')[1];
        }
      }
      socket.emit('memoryMonitor', memory);
    });
  };
  const query = () => {
    redis.pipeline(
      [
        ['llen', 'cache'],
        ['llen', 'comment_cache']
      ]
    ).exec((err, result) => {
      if (err) {
        return;
      }
      let videoNum, commentNum;
      if (result[0][1]) {
        videoNum = result[0][1];
      } else {
        videoNum = 0;
      }
      if (result[1][1]) {
        commentNum = result[1][1];
      } else {
        commentNum = 0;
      }
      socket.emit('cache', { videoNum, commentNum });
    });
  };
  query();
  queryMemory();
  setInterval(() => {
    query();
    queryMemory();
  }, 300000);
};