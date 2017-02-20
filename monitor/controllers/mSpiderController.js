const Redis = require('ioredis')
const moment = require('moment')
const logging = require( 'log4js' )
const logger = logging.getLogger('接口状态监控')

const mSpiderClient = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/7`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})

const urlStatusMonitor = () =>{
    setInterval(_getErrUrlInfo, 5000)
    setInterval(_getSuccUrlInfo, 5000)
}

const _getErrUrlInfo = () => {
    logger.debug("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    mSpiderClient.hget("*:error:*",(err,result) => {
        logger.debug("~~~~~~~~~~~~~~~~~~",err,result)
    })
}

const _getSuccUrlInfo = () => {
    logger.debug("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    mSpiderClient.hget("*:success:*",(err,result) => {
        logger.debug("~~~~~~~~~~~~~~~~~~",err,result)
    })
}
urlStatusMonitor()
exports.urlStatusMonitor = urlStatusMonitor
exports.mSpiderClient = monitorClint
exports.logger = logger


// const emailServerLz = require('./emailServerLz')
// const platformMap = {
//     "1": "youku",
//     "2": "iqiyi",
//     "3": "le"
// }
// // 将错误信息存储到数据库，达到一定频率，发报警邮件
//     // ---->定时监控redis内容，查看错误是否有重复
// exports.judgeRes = (core,platform,url,bid,err,res,callback,urlDesc) => {
//     if(err){
//         this.errStoraging(core,platform,url,bid,err,"responseErr",urlDesc)
//         return callback(err)
//     }
//     if(res && res.statusCode != 200){
//         this.errStoraging(core,platform,url,bid,res.errDesc,"responseErr",urlDesc)
//         return callback()
//     }
// }
// exports.sendDb = (core,media) => {
//     let MSDB = core.MSDB,
//         logger = core.settings.logger,
//         curPlatform
//     for(let key in platformMap){
//         if(key == media.platform){
//             curPlatform = platformMap[key]
//         }
//     }
//     MSDB.hset(`${curPlatform}:nomal:${media.aid}`,"play_num",media.play_num,(err,result)=>{
//         if ( err ) {
//             logger.error( '加入接口监控数据库出现错误：', err )
//             return
//         }
//         logger.debug(`${curPlatform} ${media.aid} 的播放量加入数据库`)
//     })
//     MSDB.expire(`${curPlatform}:${media.aid}`,5*60*60) 
// }
// exports.succStorage = (core,platform,url,urlDesc) => {
//     let logger = core.settings.logger,
//         MSDB = core.MSDB,
//         curSuccKey = `${platform}:success:${urlDesc}`,
//         succTimes
//     MSDB.hget(curSuccKey,"succTimes",(err,result) => {
//         if(err){
//             logger.error( '获取接口成功调取次数出现错误', err )
//             return
//         }
//         if (!result) {
//             succTimes = 1
//         }  else {
//             succTimes = Number(result) + 1
//         }
//         MSDB.hset(curSuccKey,"succTimes",succTimes,(err,result) => {
//             if(err){
//                 logger.error( '设置接口成功调取次数出现错误', err )
//                 return
//             }
//         })
//     })
// }
// exports.errStoraging = (core,platform,url,bid,errDesc,errType,urlDesc) => {
//     let options = {
//             platform: platform,
//             url: url,
//             bid: bid,
//             errDesc: errDesc,
//             times: 1
//         },
//         logger = core.settings.logger,
//         MSDB = core.MSDB,
//         currentErr = JSON.stringify(options),
//         curErrKey = `${platform}:error:${urlDesc}:${errType}`
//     logger.debug("有错误发生喽，正在分析与存储~~~~~~")
//     // MSDB存数据方法
    
//     if(options.errDesc.code == "ESOCKETTIMEDOUT" || "ETIMEOUT"){
//         logger.debug(`${platform}平台urlDesc接口：${url}调用超时`)
//         return
//     }
//     function pushCurErr(MSDB,options){
//         MSDB.set(curErrKey,JSON.stringify(options),(err,result) => {
//             if ( err ) {
//                 logger.error( '错误信息加入数据库失败出现错误：', err )
//                 return
//             }
//             logger.debug(`错误信息已加入数据库`)
//         })
//         MSDB.expire("err",24*60*60) ;
//         logger.debug("错误已存入redis")

//     }
//     //// 如果是接口返回内容错误，直接存储错误并发报错邮件，返回
//     if(errType == "resultErr" || "doWithResErr"){
//         // error类型，直接报错
//          MSDB.get(curErrKey,(err,result) => {
//             if(err||!result){
//                 pushCurErr(MSDB,options)
//             }  else{
//                 let curErrTimes = JSON.parse(result).times
//                     curErrTimes++
//                 let newOptions = {
//                     platform: options.platform,
//                     url: options.url,
//                     bid: options.bid,
//                     errDesc: options.errDesc,
//                     times: curErrTimes
//                 }
//                 pushCurErr(MSDB,newOptions)
//                 let subject = "接口监控报警",
//                     content = `平台：${options.platform}<br/>接口：${options.url}<br/>用户ID：${options.bid}错误描述：${options.errDesc}<br/>错误次数：${curErrTimes}`;
//                 logger.debug("错误内容：",content)
//                 emailServerLz.sendAlarm(subject, options)
//             }
//         })
//         return
//     }
//     // 取keys，与当前key作比较，若无相同，直接记录，若有相同，其times+1
//     logger.debug("开始获取已存储的所有key")

//     MSDB.get(curErrKey,(err,result) => {
//         if(err||!result){
//             pushCurErr(MSDB,options)
//         }  else{
//             let curErrTimes = JSON.parse(result).times
//                 curErrTimes++
//                 if(result.times >= 4){
//                 let subject = "接口监控报警",
//                     content = `平台：${options.platform}<br/>接口：${options.url}<br/>用户ID：${options.bid}错误描述：${options.errDesc}<br/>错误次数：${options.times}`;
//                     emailServerLz.sendAlarm(subject, options)
//                     logger.error("邮件信息subject="+subject+"content="+content)
//             }
//             let nweOptions = {
//                 platform: options.platform,
//                 url: options.url,
//                 bid: options.bid,
//                 errDesc: options.errDesc,
//                 times: curErrTimes
//             }
//             pushCurErr(MSDB,nweOptions)
//         }

//     })
// }