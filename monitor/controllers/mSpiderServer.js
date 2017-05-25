const schedule = require('node-schedule');
const emailServerLz = require('./emailServerLz');
const Redis = require('ioredis');
const moment = require('moment');
const logging = require('log4js');
const logger = logging.getLogger('接口监控');
const async = require('async');
const events = require('events');
const storageClient = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e970ad613f13a4.redis.rds.aliyuncs.com:6379/6', {
  reconnectOnError(err) {
    if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
      return true;
    }
  }
});
const mSpiderClient = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e970ad613f13a4.redis.rds.aliyuncs.com:6379/7', {
  reconnectOnError(err) {
    if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
      return true;
    }
  }
});
let platform, message;
exports.start = () => {
  const eventEmitter = new events.EventEmitter();
  mSpiderClient.subscribe('enough');
    // logger.debug("开始监听enough频道")
  mSpiderClient.on('message', (channel, message) => {
    const data = { channel, message };
    eventEmitter.emit('gotMsg', data);
  });
  eventEmitter.on('gotMsg', (data) => {
        // logger.debug("获取到msg和data",data)
    let arr = data.message.split('-'),
      channel = data.channel,
      platform = arr[0],
      urlDesc = arr[1];
    getErr(channel, platform, urlDesc);
  });
};
const toSendWarnEmail = (emailOptions, callback) => {
        // logger.debug("toSendWarnEmail",emailOptions)
  let newDate = new Date(),
    day = newDate.getDay(),
    newTime = newDate.getTime(),
    platform = emailOptions.platform,
    urlDesc = emailOptions.urlDesc, tableBody, content,
    time = emailOptions.lastTime,
    bid = emailOptions.bid,
    totalTimes = emailOptions.totalTimes,
    errDesc = emailOptions.errDesc,
    errObj = emailOptions.errObj,
    errType = emailOptions.errType,
    errTimes = emailOptions.errTimes,
    firstTime = emailOptions.firstTime,
    lastTime = emailOptions.lastTime;
            // logger.debug("firstTime lastTime",firstTime,lastTime)
  storageClient.hget('apiMonitor:errToSand', `${platform}_${urlDesc}_${errType}`, (err, result) => {
    if (err) {
      return;
    }
    if (!result) {
                // 没有错误记录，记录错误并发邮件
      storageClient.hset('apiMonitor:errToSand', `${platform}_${urlDesc}_${errType}`, time, (err, result) => {
        if (err) {
          return;
        }
                    // 发送邮件
        sendWarnEmail(emailOptions);
      });
      return;
    }
            // 有错误记录，查看错误记录时间与当前时间的间隔，间隔在半小时之内，不发,只存
    if (time - result <= 30 * 60 * 1000) {
      storageClient.hset('apiMonitor:errToSand', `${platform}_${urlDesc}_${errType}`, time, (err, result) => {
        if (err) {

        }
      });
      return;
    }
            // 间隔在半小时之外，存入当前，发邮件
    storageClient.hset('apiMonitor:errToSand', `${platform}_${urlDesc}_${errType}`, time, (err, result) => {
      if (err) {
        return;
      }
                // 发送邮件
      sendWarnEmail(emailOptions);
    });
  });
  storageClient.expire('apiMonitor:errToSand', 24 * 60 * 60);
};
const sendWarnEmail = (emailOptions) => {
  let subject = `接口监控：${emailOptions.platform}平台${emailOptions.urlDesc}接口报警`,
    tableHead = '<tr><td>平台</td><td>账号id</td><td>接口描述</td><td>错误类型</td><td>错误描述</td><td>错误次数</td><td>接口总请求次数</td><td>接口首次调用时间</td><td>接口最近调用时间</td></tr>',
    fstDate = new Date(emailOptions.firstTime),
    lastDate = new Date(emailOptions.lastTime),
    fstYear = fstDate.getFullYear(),
    fstMonth = fstDate.getMonth() + 1,
    fstDay = fstDate.getDate(),
    fstHours = fstDate.getHours(),
    fstMinutes = fstDate.getMinutes(),
    lastYear = lastDate.getFullYear(),
    lastMonth = lastDate.getMonth() + 1,
    lastDay = lastDate.getDate(),
    lastHours = lastDate.getHours(),
    lastMinutes = lastDate.getMinutes(),
    fstTime = `${fstYear}年${fstMonth}月${fstDay}日${fstHours}时${fstMinutes}分`,
    lastsTime = `${lastYear}年${lastMonth}月${lastDay}日${lastHours}时${lastMinutes}分`;
        // 遍历key，获取所有错误信息，发送邮件
  if (emailOptions.errTimes > emailOptions.totalTimes) {
    emailOptions.errTimes = emailOptions.totalTimes;
  }
  let tableBody = `<tr><td>${emailOptions.platform}</td><td>${emailOptions.bid}</td><td>${emailOptions.urlDesc}</td><td>${emailOptions.errType}</td><td>${emailOptions.errDesc}</td><td>${emailOptions.errTimes}</td><td>${emailOptions.totalTimes}</td><td>${fstTime}</td><td>${lastsTime}</td></tr>`,
    content = `<style>table{border-collapse:collapse;margin:20px;}table,th,td{border: 1px solid #000;}</style><table>${tableHead}${tableBody}</table>`;
    // logger.debug("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",subject,content)
  emailServerLz.sendAlarm(subject, content);
  emailOptions = null;
};
const getErr = (channel, platform, urlDesc) => {
    // logger.debug("进入getErr",platform,urlDesc)
  let nowDate = new Date(),
    hour = nowDate.getHours(),
    times;
  let curKey = 'apiMonitor:error',
    i,
    curField = `${platform}_${urlDesc}`;
            // 获取当前接口对应的错误记录
  storageClient.hget(curKey, curField, (err, result) => {
                // logger.debug("获取当前接口对应的错误记录=",curKey,curField)
    if (err) {
                    // 发生错误，恢复订阅，返回
      logger.debug('读取redis发生错误');
                    // mSpiderClient.subscribe("enough")
      return;
    }
    if (!result) {
                    // error结果为空，删除本次total记录，恢复订阅，返回
                    // logger.debug(`暂无${platform}_${urlDesc}的错误记录`)
      mSpiderClient.hdel('apiMonitor:all', `${platform}_${urlDesc}`, (err, result) => {
        if (err) {

        }
                        // logger.debug("读取error结果为空，删除本次total记录，恢复订阅")
                        // mSpiderClient.subscribe("enough")
      });
      return;
    }
                // 当前接口对应错误
    let　 errResult = result,
      options;
                // 获取当前url对应的全部请求次数
    storageClient.hget('apiMonitor:all', `${platform}_${urlDesc}`, (err, result) => {
                    // logger.debug("获取当前url对应的全部请求次数=",curKey,result)
      if (err) {
                        // 发生错误，恢复订阅，返回
        logger.debug('读取redis发生错误');
                        // mSpiderClient.subscribe("enough")
        return;
      }
      if (!result) {
                        // 无结果，恢复订阅，返回
        logger.debug(`暂无${platform}:${urlDesc}的请求记录`);
                        // mSpiderClient.subscribe("enough")
        return;
      }
      result = JSON.parse(result);
      if (result.times <= 1) {
                        // mSpiderClient.subscribe("enough")
        return;
      }
                    // logger.debug(result,result.times)
      options = {
        urlDesc,
        hourStr: hour,
        result: errResult,
        totalResult: result.times,
        firstTime: result.firstTime,
        lastTime: result.lastTime
      };
                    // logger.debug("~~~~~~~~~~~~~~~~~~~~~~~~options",options)
                    // 删除本次监听的数据
      storageClient.hdel(curKey, curField, (err, result) => {
        if (err) {
          return;
        }
                        // logger.debug(`key:${curKey}-field:${curField}已删除`)
        storageClient.hdel('apiMonitor:all', `${platform}_${urlDesc}`, (err, result) => {
          if (err) {
            return;
          }
                            // logger.debug(`key:apiMonitor:all-field:${platform}_${urlDesc}已删除`)
                            // 开始判断各平台错误几率
          judgePlatsError(platform, options);
        });
      });
    });
  });
        // }
    // })
};
const judgePlatsError = (platform, options) => {
  switch (platform) {
    case 'youku':
      youkuJudgeErr(options);
      break;
    case 'iqiyi':
      iqiyiJudgeErr(options);
      break;
    case 'le':
      leJudgeErr(options);
      break;
    case 'tencent':
      tencentJudgeErr(options);
      break;
    case 'meipai':
      meipaiJudgeErr(options);
      break;
    case 'toutiao':
      toutiaoJudgeErr(options);
      break;
    case 'miaopai':
      miaopaiJudgeErr(options);
      break;
    case 'souhu':
      souhuJudgeErr(options);
      break;
    case 'bili':
      biliJudgeErr(options);
      break;
    case 'kuaibao':
      kuaibaoJudgeErr(options);
      break;
    case 'yidian':
      yidianJudgeErr(options);
      break;
    case 'tudou':
      tudouJudgeErr(options);
      break;
    case 'baomihua':
      baomihuaJudgeErr(options);
      break;
    case 'ku6':
      kusixJudgeErr(options);
      break;
    case 'btime':
      btimeJudgeErr(options);
      break;
    case 'weishi':
      weishiJudgeErr(options);
      break;
    case 'xiaoying':
      xiaoyingJudgeErr(options);
      break;
    case 'budejie':
      budejieJudgeErr(options);
      break;
    case 'neihan':
      neihanJudgeErr(options);
      break;
    case 'yy':
      yyJudgeErr(options);
      break;
    case 'tv56':
      tv56JudgeErr(options);
      break;
    case 'acfun':
      acfunJudgeErr(options);
      break;
    case 'weibo':
      weiboJudgeErr(options);
      break;
    case 'ifeng':
      ifengJudgeErr(options);
      break;
    case 'wangyi':
      wangyiJudgeErr(options);
      break;
    case 'uctt':
      ucttJudgeErr(options);
      break;
    case 'mgtv':
      mgtvJudgeErr(options);
      break;
    case 'baijia':
      baijiaJudgeErr(options);
      break;
    case 'qzone':
      qzoneJudgeErr(options);
      break;
    case 'cctv':
      cctvJudgeErr(options);
      break;
    case 'pptv':
      pptvJudgeErr(options);
      break;
    case 'xinlan':
      xinlanJudgeErr(options);
      break;
    case 'v1':
      v1JudgeErr(options);
      break;
    case 'fengxing':
      fengxingJudgeErr(options);
      break;
    case 'huashu':
      huashuJudgeErr(options);
      break;
    case 'baofeng':
      baofengJudgeErr(options);
      break;
    case 'baiduvideo':
      baiduvideoJudgeErr(options);
      break;
    case 'liVideo':
      liVideoJudgeErr(options);
      break;
    default:
      logger.debug(options, '无当前平台信息');
      break;
  }
};
const judgeResults = (options, emailOptions, numberArr) => {
    // logger.debug("judgeResults  options=================",options)
  let resultObj = JSON.parse(options.result),
    nowDate = new Date(),
    nowTime = nowDate.getTime();
    // logger.debug("开始分析错误并将出错比例存入redis")
    // if(resultObj.responseErr.times){
    //     storageClient.hset(`apiMonitor:errTable`,`${emailOptions.platform}_${options.urlDesc}_responseErr_${nowTime}`,resultObj.responseErr.times+"/"+options.totalResult)
    // }else if(resultObj.resultErr.times){
    //     storageClient.hset(`apiMonitor:errTable`,`${emailOptions.platform}_${options.urlDesc}_resultErr_${nowTime}`,resultObj.resultErr.times+"/"+options.totalResult)
    // }else if(resultObj.doWithResErr.times){
    //     storageClient.hset(`apiMonitor:errTable`,`${emailOptions.platform}_${options.urlDesc}_doWithResErr_${nowTime}`,resultObj.doWithResErr.times+"/"+options.totalResult)
    // }else if(resultObj.domBasedErr.times){
    //     storageClient.hset(`apiMonitor:errTable`,`${emailOptions.platform}_${options.urlDesc}_domBasedErr_${nowTime}`,resultObj.domBasedErr.times+"/"+options.totalResult)
    // }else if(resultObj.timeoutErr.times){
    //     storageClient.hset(`apiMonitor:errTable`,`${emailOptions.platform}_${options.urlDesc}_timeoutErr_${nowTime}`,resultObj.timeoutErr.times+"/"+options.totalResult)
    // }else if(resultObj.statusErr.times){
    //     storageClient.hset(`apiMonitor:errTable`,`${emailOptions.platform}_${options.urlDesc}_statusErr_${nowTime}`,resultObj.statusErr.times+"/"+options.totalResult)
    // }
  if (resultObj.responseErr.times
        && resultObj.responseErr.times / (+options.totalResult) > numberArr[0]) {
        // 平台 接口描述 接口 错误类型  错误描述 发生时间 出错次数  共访问次数
    emailOptions.errType = 'responseErr';
    emailOptions.errTimes = resultObj.responseErr.times;
    emailOptions.errDesc = resultObj.responseErr.desc;
    emailOptions.urls = resultObj.responseErr.errUrls;
        // setWarnErrTable(emailOptions)
    toSendWarnEmail(emailOptions);
    return;
  } else if (resultObj.resultErr.times
        && resultObj.resultErr.times / (+options.totalResult) > numberArr[1]) {
    emailOptions.errType = 'resultErr';
    emailOptions.errTimes = resultObj.resultErr.times;
    emailOptions.errDesc = resultObj.resultErr.desc;
    emailOptions.urls = resultObj.resultErr.errUrls;
        // setWarnErrTable(emailOptions)
    toSendWarnEmail(emailOptions);
    return;
  } else if (resultObj.doWithResErr.times
        && resultObj.doWithResErr.times / (+options.totalResult) > numberArr[2]) {
    emailOptions.errType = 'doWithResErr';
    emailOptions.errTimes = resultObj.doWithResErr.times;
    emailOptions.errDesc = resultObj.doWithResErr.desc;
    emailOptions.urls = resultObj.doWithResErr.errUrls;
        // setWarnErrTable(emailOptions)
    toSendWarnEmail(emailOptions);
    return;
  } else if (resultObj.domBasedErr.times
        && resultObj.domBasedErr.times / (+options.totalResult) > numberArr[3]) {
    emailOptions.errType = 'domBasedErr';
    emailOptions.errTimes = resultObj.domBasedErr.times;
    emailOptions.errDesc = resultObj.domBasedErr.desc;
    emailOptions.urls = resultObj.domBasedErr.errUrls;
        // setWarnErrTable(emailOptions)
    toSendWarnEmail(emailOptions);
    return;
  } else if (resultObj.timeoutErr.times
        && resultObj.timeoutErr.times / (+options.totalResult) > numberArr[4]) {
    emailOptions.errType = 'timeoutErr';
    emailOptions.errTimes = resultObj.timeoutErr.times;
    emailOptions.errDesc = resultObj.timeoutErr.desc;
    emailOptions.urls = resultObj.timeoutErr.errUrls;
        // setWarnErrTable(emailOptions)
    toSendWarnEmail(emailOptions);
    return;
  } else if (resultObj.playNumErr.times) {
    emailOptions.errType = 'playNumErr';
    emailOptions.errTimes = resultObj.playNumErr.times;
    emailOptions.errDesc = resultObj.playNumErr.desc;
    emailOptions.urls = resultObj.playNumErr.errUrls;
    toSendWarnEmail(emailOptions);
    return;
  } else if (resultObj.statusErr.times
        && resultObj.statusErr.times / (+options.totalResult) > numberArr[5]) {
    emailOptions.errType = 'statusErr';
    emailOptions.errTimes = resultObj.statusErr.times;
    emailOptions.errDesc = resultObj.statusErr.desc;
    emailOptions.urls = resultObj.statusErr.errUrls;
        // setWarnErrTable(emailOptions)
    toSendWarnEmail(emailOptions);
    return;
  }
        // logger.debug("当前错误未达到报错标准，恢复对enough的监听")
        // mSpiderClient.subscribe("enough")
  return;

  options = null;
  numberArr = [];
};
/*
    // const getLiVideoError = () => {
    //     // logger.debug("getLiVideoError")
    //     let urlDescArr = ["list","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("liVideo",urlDesc)
    //     }
    // }
    // const getBaiduvideoError = () => {
    //     // logger.debug("getBaiduvideoError")
    //     let urlDescArr = ["total","list","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("baiduvideo",urlDesc)
    //     }
    // }
    // const getBaofengError = () => {
    //     // logger.debug("getBaofengError")
    //     let urlDescArr = ["theAlbum","list","desc","support","comment"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("baofeng",urlDesc)
    //     }
    // }
    // const getHuashuError = () => {
    //     // logger.debug("getHuashuError")
    //     let urlDescArr = ["vidList","videoList","info","comment","play"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("huashu",urlDesc)
    //     }
    // }
    // const getFengxingError = () => {
    //     // logger.debug("getFengxingError")
    //     let urlDescArr = ["video","fans","list","info","creatTime","comment"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("fengxing",urlDesc)
    //     }
    // }
    // const getV1Error = () => {
    //     // logger.debug("getV1Error")
    //     let urlDescArr = ["fans","total","list","suport","videoInfo","vidInfo"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("v1",urlDesc)
    //     }
    // }
    // const getXinlanError = () => {
    //     // logger.debug("getXinlanError")
    //     let urlDescArr = ["list","save","suport","comment","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("xinlan",urlDesc)
    //     }
    // }
    // const getPptvError = () => {
    //     // logger.debug("getPptvError")
    //     let urlDescArr = ["list","total","info"]
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("pptv",urlDesc)
    //     }
    // }
    // const getCctvError = () => {
    //     // logger.debug("getCctvError")
    //     let urlDescArr = ["fans","total","list","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("cctv",urlDesc)
    //     }
    // }
    // const getQzoneError = () => {
    //     // logger.debug("getQzoneError")
    //     let urlDescArr = ["fan","list","info","comment"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("qzone",urlDesc)
    //     }
    // }
    // const getBaijiaError = () => {
    //     // logger.debug("getBaijiaError")
    //     let urlDescArr = ["toal","fan","list","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("baijia",urlDesc)
    //     }
    // }
    // const getMgtvError = () => {
    //     // logger.debug("getMgtvError")
    //     let urlDescArr = ["list","commentNum","like","desc","class","play","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("mgtv",urlDesc)
    //     }
    // }
    // const getUcttError = () => {
    //     // logger.debug("getUcttError")
    //     let urlDescArr = ["list","info","commentNum","desc"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("uctt",urlDesc)
    //     }
    // }
    // const getWangyiError = () => {
    //     // logger.debug("getWangyiError")
    //     let urlDescArr = ["user","list","video","play"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("wangyi",urlDesc)
    //     }
    // }
    // const getIfengError = () => {
    //     // logger.debug("getIfengError")
    //     let urlDescArr = ["total","list","video"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("ifeng",urlDesc)
    //     }
    // }
    // const getWeiboError = () => {
    //     // logger.debug("getAcfunError")
    //     let urlDescArr = ["user","total","list","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("weibo",urlDesc)
    //     }
    // }
    // const getAcfunError = () => {
    //     // logger.debug("getAcfunError")
    //     let urlDescArr = ["user","total","list"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("acfun",urlDesc)
    //     }
    // }
    // const getTv56Error = () => {
    //     // logger.debug("getTv56Error")
    //     let urlDescArr = ["user","total","videos","info","comment"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("tv56",urlDesc)
    //     }
    // }
    // const getYyError = () => {
    //     // logger.debug("getYyError")
    //     let urlDescArr = ["total","live","slist","dlist","list"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("yy",urlDesc)
    //     }
    // }
    // const getNeihanError = () => {
    //     // logger.debug("getNeihanError")
    //     let urlDescArr = ["user","list"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("neihan",urlDesc)
    //     }
    // }
    // const getBudejieError = () => {
    //     // logger.debug("getBudejieError")
    //     let urlDescArr = ["user","list"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("budejie",urlDesc)
    //     }
    // }
    // const getXiaoyingError = () => {
    //     // logger.debug("getXiaoyingError")
    //     let urlDescArr = ["info","list","total"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("xiaoying",urlDesc)
    //     }
    // }
    // const getWeishiError = () => {
    //     // logger.debug("getWeishiError")
    //     let urlDescArr = ["user","list"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("weishi",urlDesc)
    //     }
    // }
    // const getBtimeError = () => {
    //     // logger.debug("getBtimeError")
    //     let urlDescArr = ["user","list","info","comment"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("btime",urlDesc)
    //     }
    // }
    // const getKusixError = () => {
    //     // logger.debug("getKusixError")
    //     let urlDescArr = ["user","total","list"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("ku6",urlDesc)
    //     }
    // }
    // const getBaomihuaError = () => {
    //     // logger.debug("getBaomihuaError")
    //     let urlDescArr = ["user","list","Expr","playNum","ExprPC"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("baomihua",urlDesc)
    //     }
    // }
    // const getTudouError = () => {
    //     // logger.debug("getTudouError")
    //     let urlDescArr = ["user","fans","total","list","videoTime","Expr"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("tudou",urlDesc)
    //     }
    // }
    // const getYidianError = () => {
    //     // logger.debug("getYidianError")
    //     let urlDescArr = ["user","interestId","list"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("yidian",urlDesc)
    //     }
    // }
    // const getSouhuError = () => {
    //     // logger.debug("进入getSouhuError")
    //     let urlDescArr = ["user","total","list","info","commentNum"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("souhu",urlDesc)
    //     }
    // }
    // const getKuaibaoError = () => {
    //     // logger.debug("进入getKuaibaoError")
    //     let urlDescArr = ["user","videos","info","commentNum","Expr","play","field"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("kuaibao",urlDesc)
    //     }
    // }
    // const getMeipaiError = () => {
    //     // logger.debug("进入getMeipaiError")
    //     let urlDescArr = ["user","total","videos","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("meipai",urlDesc)
    //     }
    // }
    // const getMiaopaiError = () => {
    //     // logger.debug("进入getMiaopaiError")
    //     let urlDescArr = ["user","total","videos","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("miaopai",urlDesc)
    //     }
    // }
    // const getToutiaoError = () => {
    //     // logger.debug("进入getToutiaoError")
    //     let urlDescArr = ["user","userId","list","play"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("toutiao",urlDesc)
    //     }
    // }
    // const getIqiyiError = () => {
    //     // logger.debug("进入getIqiyiError")
    //     let urlDescArr = ["user","total","_user","list","ids","info","Expr","play","comment"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("iqiyi",urlDesc)
    //     }
    // }
    // const getLeError = () => {
    //     // logger.debug("进入getLeError")
    //     let urlDescArr = ["list","total","Expr","info","Desc"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("le",urlDesc)
    //     }
    // }
    // const getTencentError = () => {
    //     // logger.debug("进入getTencentError")
    //     let urlDescArr = ["total","user","list","view","comment","commentNum","vidTag"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("tencent",urlDesc)
    //     }
    // }
    // const getYoukuError = () => {
    //     // logger.debug("进入getYoukuError")
    //     let urlDescArr = ["user","total","videos","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("youku",urlDesc)
    //     }
    // }
    // const getBiliError = () => {
    //     // logger.debug("进入getBiliError")
    //     let urlDescArr = ["user","total","videos","info"],
    //         urlDesc,i
    //     for(i = 0; i < urlDescArr.length; i++){
    //         urlDesc = urlDescArr[i]
    //         getErr("bili",urlDesc)
    //     }
    // }
*/
const liVideoJudgeErr = (options) => {
    // ["list","info"]
    // logger.debug("liVideoJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'liVideo',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const baiduvideoJudgeErr = (options) => {
    // ["total","list","info"]
    // logger.debug("baiduvideoJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'baiduvideo',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const baofengJudgeErr = (options) => {
    // ["theAlbum","list","desc","support","comment","aid"]
    // logger.debug("baofengJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'baofeng',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'theAlbum':
      emailOptions.urlDesc = 'theAlbum';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'desc':
      emailOptions.urlDesc = 'desc';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'support':
      emailOptions.urlDesc = 'support';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'aid':
      emailOptions.urlDesc = 'aid';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const huashuJudgeErr = (options) => {
    // ["vidList","videoList","info","comment","play"]
    // logger.debug("huashuJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'huashu',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'vidList':
      emailOptions.urlDesc = 'vidList';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'videoList':
      emailOptions.urlDesc = 'videoList';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'play':
      emailOptions.urlDesc = 'play';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const fengxingJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("fengxingJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'fengxing',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'video':
      emailOptions.urlDesc = 'video';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'fans':
      emailOptions.urlDesc = 'fans';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'creatTime':
      emailOptions.urlDesc = 'creatTime';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const v1JudgeErr = (options) => {
    // ["","",""]
    // logger.debug("v1JudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'v1',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'fans':
      emailOptions.urlDesc = 'fans';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'support':
      emailOptions.urlDesc = 'support';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const xinlanJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("xinlanJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'xinlan',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'save':
      emailOptions.urlDesc = 'save';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'suport':
      emailOptions.urlDesc = 'suport';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const pptvJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("pptvJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'pptv',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const cctvJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("cctvJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'cctv',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'fans':
      emailOptions.urlDesc = 'fans';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const qzoneJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("qzoneJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'qzone',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'fan':
      emailOptions.urlDesc = 'fan';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const baijiaJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("baijiaJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'baijia',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'fan':
      emailOptions.urlDesc = 'fan';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const mgtvJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("mgtvJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'mgtv',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'commentNum':
      emailOptions.urlDesc = 'commentNum';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'like':
      emailOptions.urlDesc = 'like';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'desc':
      emailOptions.urlDesc = 'desc';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'class':
      emailOptions.urlDesc = 'class';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'play':
      emailOptions.urlDesc = 'play';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const ucttJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("ucttJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'uctt',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'commentNum':
      emailOptions.urlDesc = 'commentNum';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'desc':
      emailOptions.urlDesc = 'desc';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const wangyiJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("wangyiJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'wangyi',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'video':
      emailOptions.urlDesc = 'video';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'paly':
      emailOptions.urlDesc = 'paly';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const ifengJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("ifengJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'ifeng',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'video':
      emailOptions.urlDesc = 'video';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const weiboJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("weiboJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'weibo',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.6, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.6, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.6, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.6, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const acfunJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("acfunJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'acfun',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const tv56JudgeErr = (options) => {
    // ["user","total","videos","info","comment"]
    // logger.debug("tv56JudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'tv56',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'videos':
      emailOptions.urlDesc = 'videos';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const yyJudgeErr = (options) => {
    // ["total","live","slist","dlist","list"]
    // logger.debug("yyJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'yy',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'live':
      emailOptions.urlDesc = 'live';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'slist':
      emailOptions.urlDesc = 'slist';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'dlist':
      emailOptions.urlDesc = 'dlist';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const neihanJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("neihanJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'neihan',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const budejieJudgeErr = (options) => {
    // ["","",""]
    // logger.debug("budejieJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'budejie',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const xiaoyingJudgeErr = (options) => {
    // ["info","list","total"]
    // logger.debug("xiaoyingJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'xiaoying',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const weishiJudgeErr = (options) => {
    //
    // logger.debug("weishiJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'weishi',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const btimeJudgeErr = (options) => {
    // ["user","list","info","comment"]
    // logger.debug("btimeJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'btime',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const kusixJudgeErr = (options) => {
    //
    // logger.debug("kusixJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'ku6',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const baomihuaJudgeErr = (options) => {
    // ["user","list","Expr","playNum","ExprPC"]
    // logger.debug("baomihuaJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'baomihua',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'Expr':
      emailOptions.urlDesc = 'Expr';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'ExprPC':
      emailOptions.urlDesc = 'ExprPC';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'playNum':
      emailOptions.urlDesc = 'playNum';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const tudouJudgeErr = (options) => {
    // ["user","fans","total","list","videoTime","Expr"]
    // logger.debug("yidianJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'tudou',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'fans':
      emailOptions.urlDesc = 'fans';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'videoTime':
      emailOptions.urlDesc = 'videoTime';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'Expr':
      emailOptions.urlDesc = 'Expr';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const yidianJudgeErr = (options) => {
    // user interestId list
    // logger.debug("yidianJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'yidian',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'interestId':
      emailOptions.urlDesc = 'interestId';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const tencentJudgeErr = (options) => {
    // ["total","user","list","view","comment","commentNum","vidTag"]
    // logger.debug("tencentJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'tencent',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'view':
      emailOptions.urlDesc = 'view';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'commentNum':
      emailOptions.urlDesc = 'commentNum';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'vidTag':
      emailOptions.urlDesc = 'vidTag';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const kuaibaoJudgeErr = (options) => {
    // ["user","videos","info","commentNum","Expr","play","field"]
    // logger.debug("kuaibaoJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'kuaibao',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'videos':
      emailOptions.urlDesc = 'videos';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'commentNum':
      emailOptions.urlDesc = 'commentNum';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'Expr':
      emailOptions.urlDesc = 'Expr';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'play':
      emailOptions.urlDesc = 'play';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'field':
      emailOptions.urlDesc = 'field';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const souhuJudgeErr = (options) => {
    // logger.debug("souhuJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'souhu',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'commentNum':
      emailOptions.urlDesc = 'commentNum';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'digg':
      emailOptions.urlDesc = 'digg';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const toutiaoJudgeErr = (options) => {
    // logger.debug("toutiaoJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'toutiao',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'userId':
      emailOptions.urlDesc = 'userId';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'listInfo':
      emailOptions.urlDesc = 'listInfo';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const meipaiJudgeErr = (options) => {
    // logger.debug("meipaiJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'meipai',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'videos':
      emailOptions.urlDesc = 'videos';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const miaopaiJudgeErr = (options) => {
    // logger.debug("miaopaiJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'miaopai',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'videos':
      emailOptions.urlDesc = 'videos';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const biliJudgeErr = (options) => {
    // logger.debug("biliJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'bili',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'videos':
      emailOptions.urlDesc = 'videos';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const youkuJudgeErr = (options) => {
    // logger.debug("youkuJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'youku',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'videos':
      emailOptions.urlDesc = 'videos';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const iqiyiJudgeErr = (options) => {
    // logger.debug("iqiyiJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'iqiyi',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
        // ["user","total","_user","list","ids","info","Expr","play","comment"]
  switch (options.urlDesc) {
    case 'user':
      emailOptions.urlDesc = 'user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case '_user':
      emailOptions.urlDesc = '_user';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'ids':
      emailOptions.urlDesc = 'ids';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'Expr':
      emailOptions.urlDesc = 'Expr';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'play':
      emailOptions.urlDesc = 'play';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'comment':
      emailOptions.urlDesc = 'comment';
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};
const leJudgeErr = (options) => {
    // logger.debug("leJudgeErr  options=================",options)
  let errObj = JSON.parse(options.result),
    emailOptions = {
      platform: 'le',
      urlDesc: '',
      urls: '',
      bid: errObj.bid,
      errType: '',
      errDesc: '',
      hourStr: options.hourStr,
      errTimes: '',
      totalTimes: options.totalResult,
      firstTime: options.firstTime,
      lastTime: options.lastTime
    },
    numberArr;
        // ["list","total","Expr","info","Desc"]
  switch (options.urlDesc) {
    case 'list':
      emailOptions.urlDesc = 'list';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'total':
      emailOptions.urlDesc = 'total';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'Expr':
      emailOptions.urlDesc = 'Expr';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'info':
      emailOptions.urlDesc = 'info';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
    case 'Desc':
      emailOptions.urlDesc = 'Desc';
      numberArr = [0.6, 0.3, 0.3, 0.5, 0.8, 0.6];
      judgeResults(options, emailOptions, numberArr);
      break;
  }
};