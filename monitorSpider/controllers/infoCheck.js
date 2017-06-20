/**
 *  信息处理模块
 *  对接口返回的信息、粉丝数、播放量、视频数等进行反复排查，
 *  Create by zhupenghui on 2017/6/13.
* */
const Redis = require('ioredis');
const async = require('neo-async');
const logging = require('log4js');
const editEmail = require('./editEmail');
const platform = require('./platform');

// const myredis = new Redis(`redis://:C19prsPjHs52CHoA0vm@192.168.1.31:6379/6`, {
//   reconnectOnError(err) {
//     return err.message.slice(0, 'READONLY'.length) === 'READONLY';
//   }
// });
let logger = logging.getLogger('信息处理');

/**
 *  接口存储方式处理
 *  将当前的数据跟库里存下来的数据进行比对判断
 *  当接口异常之后进行报警操作
* */
const interSetErr = (events, result, typeErr) => {
  const key = `error:${result.platform}:${result.bid}:${typeErr.type}`,
    time =  parseInt(new Date().getTime() / 1000, 10);
  if ((Number(time) - Number(result.startTime)) >= 3600) {
    events.MSDB.del(key);
    return;
  }
  if (typeErr.err != result.message) {
    result.num = 0;
    result.message = typeErr.err;
    result.lastTime = time;
    events.MSDB.set(key, JSON.stringify(result));
    return;
  }
  if (Number(result.num) >= 5) {
    editEmail.interEmail(events, result);
    events.MSDB.del(key);
    return;
  }
  result.num = Number(result.num) + 1;
  result.lastTime = time;
  events.MSDB.set(key, JSON.stringify(result));
};
/**
 *  接口信息处理方法
 *  events    用来触发事件信息的例如：查库失败之后触发error事件，报告发生了什么
 *  task      任务信息
 *  typeErr   按错误类型存储错误（typeErr 是个对象）
 * */
exports.interface = (events, task, typeErr) => {
  // 获取对应的平台
  // 配置错误类型的数据库key名
  // 当前接口请求次数
  const p = platform.get(Number(task.p)),
    key = `error:${p}:${task.id}:${typeErr.type}`,
    num = 0,
    time = parseInt(new Date().getTime() / 1000, 10);
  if (typeErr.err.includes('TIMEDOUT')) {
    // 超时的错误暂时先不管
    return;
  }
  if (typeErr.err.includes('Unexpected end of JSON input')) {
    // 意外的json错误
    return;
  }
  events.MSDB.get(key, (err, result) => {
    if (err) {
      events.emit('error', {error: '接口数据库查询失败', platform: p});
      return;
    }
    try {
      result = JSON.parse(result)
    } catch (e) {
      events.emit('error', {error: '接口数据解析失败', data: result});
      return;
    }
    if (!result) {
      const errorInfo = {
        platform: p,
        bid: task.id,
        bname: task.name,
        typeErr: typeErr.type,
        message: typeErr.err,
        interface: typeErr.interface,
        url: typeErr.url,
        startTime: time,
        lastTime: time,
        num
      };
      events.MSDB.set(key, JSON.stringify(errorInfo));
      return;
    }
    interSetErr(events, result, typeErr);
  });
};

