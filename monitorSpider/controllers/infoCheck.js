/**
 *  信息处理模块
 *  对接口返回的信息、粉丝数、播放量、视频数等进行反复排查，
 *  当数据返回出现异常或者，funsNum、playNum、videoNum等出现异常波动的时候进行邮件报警
 *
 *  Create by zhupenghui on 2017/6/13.
* */
const Redis = require('ioredis');
const async = require('async');
const logging = require('log4js');
const editEmail = require('./editEmail');
const platfrom = require('./platform');

const myredis = new Redis(`redis://:C19prsPjHs52CHoA0vm@192.168.1.31:6379/6`, {
  reconnectOnError: function (err) {
    if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
      return true
    }
  }
});
let logger = loggeing.getLogger('信息处理');

/**
 *  接口存储方式处理
 *  将当前的数据跟库里存下来的数据进行比对判断
 *  当接口异常之后进行报警操作
* */
const interSetErr = (events, result, typeErr) => {
  const key = `error:${result.platfrom}:${task.id}:${typeErr.type}`;
  if (typeErr.err != result.message) {
    result.num = 0;
    result.message = typeErr.err;
    myredis.hset(key, JSON.stringify(result));
    return;
  }
  if (Number(result.num) >= 5) {
    editEmail.interEmail(events, result);
    myredis.del(key);
    return;
  }
  result.num += 1;
  myredis.hset(key, JSON.stringify(result));
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
  const p = platfrom.get(Number(task.p)),
    key = `error:${p}:${task.id}:${typeErr.type}`,
    num = 0;

  if (typeErr.err.includes('TIMEDOUT')) {
    // 超时的错误暂时先不管
    return;
  }
  myredis.hget(key, 'typeErr', (err, result) => {
    if (err) {
      events.emit('error', {error: '接口数据库查询失败'});
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
        platfrom: p,
        bid: task.id,
        encodeId: task.encodeId || '',
        bname: task.name,
        typeErr: typeErr.type,
        message: typeErr.err,
        interface: typeErr.interface,
        url: typeErr.url,
        num
      };
      myredis.hset(key, JSON.stringify(errorInfo));
      return;
    }
    interSetErr(events, result, typeErr);
  });
};

/**
 *  粉丝数的波动对比处理
 *  当粉丝数上下波动过于异常之后，将异常数据存进库中
 *  当下一轮开始的时候跟上次存储起来的数据进行对比要是异常就报警
 * */

/**
 *  粉丝数处理方法，先对库进行查询，存在数据就进行对比判断，否则就将数据存进库中
 *  events    用来触发事件信息的例如：查库失败之后触发error事件，报告发生了什么
 *  task      任务信息
 *  fans      粉丝数
 * */
exports.fansNumber = (events, task, fans) => {
  const p = platfrom.get(Number(task.p)),
    key = `fans:${p}:${task.id}`,
    num = 0;
  myredis.hget(key, 'fans', (err, result) => {
    if (err) {
      events.emit('error', {error: '粉丝数据库查询失败'});
      return;
    }
    if (!result) {
      const fansJson = {
        platform: p,
        bid: task.id,
        bname: task.name,
        url: task.url,
        fans: [fans],
        num
      };
      myredis.hset(key, JSON.parse(fansJson));
      return;
    }
    try {
      result = JSON.parse(result);
    } catch (e) {
      events.emit('error', {error: '粉丝数据库数据解析失败'});
      return;
    }
    fansSetErr(events, result);
  })
};

/**
 *  播放量处理方法
 * */
exports.playNum = () => {

};

/**
 *  视频数量处理方法
 * */
exports.videoNum = () => {

};
