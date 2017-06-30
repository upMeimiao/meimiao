/**
 *  信息处理模块
 *  对接口返回的信息、粉丝数、播放量、视频数等进行反复排查，
 *  Create by zhupenghui on 2017/6/13.
* */
const async = require('neo-async');
const logging = require('log4js');
const editEmail = require('./editEmail');
const platform = require('./platform');

let logger = logging.getLogger('信息处理');

/**
 * 查看一下发送报警的次数，如果同一错误在短时间内连续发送五次，
 * 应当停止发送需要间隔20分钟之后如果同一错误还在发生继续发送（否则删除错误发送记录）
 * */
const errorNum = (events, result, typeErr) => {
  const key = `error:${result.platform}:${result.bid}:${typeErr.type}`,
    keyNum = `errorNum:${result.platform}:${result.bid}:${typeErr.type}`,
    time =  parseInt(new Date().getTime() / 1000, 10);
  events.MSDB.get(keyNum, (err, errorData) => {
    if (err) {
      events.emit('error', {error: '发送错误次数数据查询失败', platform: result.platform});
      events = null; result = null; typeErr = null;
      return;
    }
    if (!errorData) {
      editEmail.interEmail(events, result);
      events.MSDB.set(keyNum, JSON.stringify({num: 1, startTime: time, lastTime: time}));
      events = null; result = null; typeErr = null;
      return;
    }
    try {
      errorData = JSON.parse(errorData);
    } catch (e) {
      events.emit('error', {error: '发送错误次数数据解析失败', platform: result.platform});
      events = null; result = null; typeErr = null;
      return;
    }
    // 当错误进来之后会先进行时间的判断，如果当前的错误记录的起始时间到目前为止超过了20分钟，
    // 并且最新的一次错误发生所记录的时间超过五分钟没有更新，那么就认为该平台在某个时间段出现故障，
    // 错误记录清除重新记录
    if ((Number(time) - Number(errorData.startTime) >= 1200) && (Number(time) - Number(errorData.lastTime) > 300)) {
      events.MSDB.del(key);
      events.MSDB.del(keyNum);
      return;
    }
    if ((Number(time) - Number(errorData.startTime) >= 1200) && Number(errorData.num) > 10) {
      result.num = 1;
      events.MSDB.set(key, JSON.stringify(result));
      events.MSDB.del(keyNum);
      return;
    }
    if (Number(errorData.num) <= 5) {
      editEmail.interEmail(events, result);
      errorData.num += 1;
      errorData.lastTime = time;
      events.MSDB.set(keyNum, JSON.stringify(errorData));
      events = null; result = null; typeErr = null; errorData = null;
      return;
    }
    errorData.num += 1;
    errorData.lastTime = time;
    events.MSDB.set(keyNum, JSON.stringify(errorData));
    events = null; result = null; typeErr = null; errorData = null;
  });
};

/**
 *  接口存储方式处理
 *  将当前的数据跟库里存下来的数据进行比对判断
 *  当接口异常之后进行报警操作
* */
const interSetErr = (events, result, typeErr) => {
  const key = `error:${result.platform}:${result.bid}:${typeErr.type}`,
    time =  parseInt(new Date().getTime() / 1000, 10);
  if ((Number(time) - Number(result.startTime)) >= 300 && (Number(time) - Number(result.lastTime)) >= 120) {
    events.MSDB.del(key);
    return;
  }
  if (typeErr.err != result.message) {
    result.num = 0;
    result.message = typeErr.err;
    result.lastTime = time;
    events.MSDB.set(key, JSON.stringify(result));
    events = null; result = null; typeErr = null;
    return;
  }
  if (Number(result.num) >= 7) {
    errorNum(events, result, typeErr);
    events = null; result = null; typeErr = null;
    return;
  }
  result.num = Number(result.num) + 1;
  result.lastTime = time;
  events.MSDB.set(key, JSON.stringify(result));
  events = null; result = null; typeErr = null;
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
  typeErr.err = JSON.stringify(typeErr.err);
  if (!typeErr.err) {
    typeErr.typeErr = 'NoError';
    typeErr.message = '错误发生了，但是没有错误信息';
    typeErr.bid = task.id;
    typeErr.platform = p;
    typeErr.bname = task.name;
    typeErr.lastTime = time;
    editEmail.interEmail(events, typeErr);
    events = null; task = null; typeErr = null;
    return;
  }
  if (typeErr.err.includes('TIMEDOUT')) {
    // 超时的错误暂时先不管
    events = null; task = null; typeErr = null;
    return;
  }
  if (typeErr.err.includes('Unexpected') || typeErr.err.includes('unexpected') || typeErr.err.includes('Invalid hexadecimal escape sequence') || typeErr.err.includes('read ECONNRESET')) {
    // 意外的json错误
    events = null; task = null; typeErr = null;
    return;
  }
  events.MSDB.get(key, (err, result) => {
    if (err) {
      events.emit('error', {error: '存放错误信息数据库查询失败', platform: p});
      events = null; task = null; typeErr = null;
      return;
    }
    try {
      result = JSON.parse(result)
    } catch (e) {
      events.emit('error', {error: '错误信息数据解析失败', data: result});
      events = null; task = null; typeErr = null;
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
      events = null; task = null; typeErr = null;
      return;
    }
    interSetErr(events, result, typeErr);
    events = null; typeErr = null; result = null;
  });
};

