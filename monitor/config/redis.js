if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') {
  module.exports = {
    port: 6379,
    host: 'r-m5e970ad613f13a4.redis.rds.aliyuncs.com',
    auth: 'C19prsPjHs52CHoA0vm'
  };
} else {
  module.exports = {
    port: 6379,
    host: '127.0.0.1',
    auth: ''
  };
}