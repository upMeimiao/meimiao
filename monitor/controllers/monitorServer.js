const schedule = require('node-schedule')
const async = require('async')
const request = require('request')
const crypto = require('crypto')
const platformMap = require('./platform')
const emailServer = require('./emailServer')
const emailServerLz = require('./emailServerLz')
const monitorContronller = require('./monitorController')
const Redis = require('ioredis')
const logger = monitorContronller.logger
const client = monitorContronller.monitorClint
const moment = require('moment')
const logging = require( 'log4js' )

const mSpiderClient = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/7`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})
// 平台 youku iqiyi le ...
// ,"tencent","meipai","toutiao","miaopai","bili","souhu","kuaibao"
// ,"yidian","tudou","baomihua","ku6","btime","weishi","xiaoying","budejie","neihan","yy"
// ,"tv56","acfun","weibo","ifeng","wangyi","uctt","mgtv","baijia","qzone","cctv"
// ,"pptv","xinlan","v1","fengxing","huashu","baofeng","baiduvideo"
const platformArr = ["youku","iqiyi","le","tencent","meipai","toutiao","miaopai","bili","souhu","kuaibao"]
// 接口描述
const urlDescArr = ["Expr","list","info","total","play","total","user","_user","Desc","videos","view","comment","commentNum","vidTag","digg","field","userId"]
// 错误类型 responseErr resultErr doWithResErr domBasedErr
// 表名 平台：接口描述
// succTimes: 24
// responseErr
// {
//     "platform": "youku",
//     "url": "http://youku.com",
//     "bid": 12345678,
//     "errDesc": {

//     }
//     "firstTime": ""
//     "times": 2,
//     "lastTime": ""
// }
 const judgeIsErr = (result,n) => {
    let results = JSON.parse(result[n]),
        fstTime = results["firstTime"],
        lastTime = results["lastTime"],
        errDesc = results["errDesc"],
        errDescript
        logger.debug("时间间隔（毫秒）=",lastTime - fstTime)
    if(1 == n){
        errDescript = "返回数据错误"
    } else if(2 == n){
        errDescript = "数据解析出错"
    } else if(3 == n){
        errDescript = "dom数据出错"
    }
    if(result[4] && results["times"]/(+result[4]) > 0.5 && (Number(lastTime) - Number(fstTime) >= 15*60*60*1000)){
        emailServerLz.sendAlarm(`${errDesc}${errDescript}`,result[n])
    }
} 
const _getKeys = () => {
    let keys,i,j,keyName
    for(i = 0; i < platformArr.length; i++){
        for(j = 0; j < urlDescArr.length; j++){
            keys = `${platformArr[i]}:${urlDescArr[j]}`
            logger.debug("~~~~~~~~~~~~~~~~~~keys=",keys)
            mSpiderClient.hmget(keys,"responseErr","resultErr","doWithResErr","domBasedErr","succTimes",(err,result) => {
                if(err){
                    logger.debug("读取redis发生错误")
                    return
                }
                if(!result){
                    logger.debug("redis中没有当前搜索的key")
                    return
                }
                // 有result
                // responseErr错误类型，一段时间内，无成功的记录
                if(result[0]){
                    let resultZero = JSON.parse(result[0]),
                        fstTime = resultZero["firstTime"],
                        lastTime = resultZero["lastTime"],
                        errDesc = resultZero["errDesc"]
                    logger.debug("result[0]",result[0])
                    logger.debug("0时间间隔（毫秒）=",lastTime,fstTime)
                    if(!result[4] && (lastTime - fstTime >= 15*60*60*1000)){
                        emailServerLz.sendAlarm(`${errDesc}发生响应错误`,result[0])
                    }
                }
                // resultErr错误类型,一段时间内发生几率
                if(result[1]){   
                    logger.debug("result[1]",result[1])
                    judgeIsErr(result,1)
                }
                // doWithResErr错误类型，一段时间内发生几率
                if(result[2]){
                    logger.debug("result[2]",result[2])
                    judgeIsErr(result,2)
                }
                // domBasedErr错误类型，一段时间内发生几率
                if(result[3]){
                    logger.debug("result[3]",result[3])
                    judgeIsErr(result,3)
                }
            })
        }
    }
}
exports.start = () => {
    const failedRule = new schedule.RecurrenceRule()
    const inactiveRule = new schedule.RecurrenceRule()
    const errReadRule = new schedule.RecurrenceRule()
    failedRule.minute = [15,45]
    inactiveRule.minute = [0,30]
    errReadRule.minute = [15,30,45]
    schedule.scheduleJob(failedRule, () =>{
        _failedTaskAlarm()
    })
    schedule.scheduleJob(inactiveRule, () =>{
        _inactiveTaskAlarm()
    })
    schedule.scheduleJob(errReadRule, () =>{
        _getKeys()
    })
}
const _inactiveTaskAlarm = () => {
    let i = 1,key,inactiveArr = []
    async.whilst(
        () => {
            return i <= 37
        },
        (cb) => {
            key = "inactive:" + i
            client.hget(key, 'num', (err, result) =>{
                if(err){
                    i++
                    return cb()
                }
                if(result > 0){
                    inactiveArr.push({
                        p: i,
                        num: Number(result)
                    })
                }
                i++
                cb()
            })
        },
        (err, result) => {
            _inactivePretreatment(inactiveArr)
        }
    )
}
const _failedTaskAlarm = () => {
    let sign = true, cursor = 0, failedArr = []
    async.whilst(
        () => {
            return sign
        },
        (cb) => {
            client.sscan('failed', cursor, 'count', 100, (err, result) => {
                if(err){
                    logger.debug(err)
                    return cb()
                }
                if(Number(result[0]) === 0){
                    sign = false
                } else {
                    cursor = result[0]
                }
                for (let [index, elem] of result[1].entries()) {
                    failedArr.push(JSON.parse(elem))
                }
                cb()
            })
        },
        (err, result) => {
            _getFailedInfo(failedArr,(err, raw) => {
                _failedPretreatment(raw)
            })
        }
    )
}
const _inactivePretreatment = (info) => {
    if(info.length === 0){
        return
    }
    let emailContent = ''
    for (let [index, elem] of info.entries()) {
        if(elem){
            emailContent += `<p>平台：${platformMap.get(Number(elem.p))}，未激活个数：${elem.num}</p>`
        }
    }
    if(emailContent != ''){
        emailServer.sendAlarm('任务未激活',emailContent)
    }
}
const _failedPretreatment = (info) => {
    if(info.length === 0){
        return
    }
    let emailContent = ''
    for (let [index, elem] of info.entries()) {
        if(elem && elem.p != 6 && elem.p != 14){
            emailContent += `<p>平台：${platformMap.get(Number(elem.p))}，bid：${elem.bid}，bname：${elem.bname}</p>`
        }
    }
    if(emailContent != ''){
        emailServer.sendAlarm('任务失败',emailContent)
    }
}
const _getFailedInfo = (info, callback) => {
    let hash,key,data
    const getRedisData = (item, callback) => {
        hash = crypto.createHash('md5')
        hash.update(item.p + ":" + item.bid)
        key = "failed:" +hash.digest('hex')
        client.hmget(key, 'times', 'lastTime', (err,result)=>{
            if(err) return callback(null, null)
            if(!result[0]){
                client.srem('failed', JSON.stringify(item))
                return callback(null, null)
            }
            if(result[1] < new Date().getTime() - 1800000) return callback(null, null)
            data = {
                p: item.p,
                bid: item.bid,
                bname: item.bname,
                times: result[0]
            }
            callback(null,data)
        })
    }
    async.map(info, getRedisData, (err, results) => {
        callback(null, results)
    })
}