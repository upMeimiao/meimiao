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
// 平台 youku iqiyi le 
// ,"tencent","meipai","toutiao","miaopai","bili","souhu","kuaibao"
// ,"yidian","tudou","baomihua","ku6","btime","weishi","xiaoying","budejie","neihan","yy"
// ,"tv56","acfun","weibo","ifeng","wangyi","uctt","mgtv","baijia","qzone","cctv"
// ,"pptv","xinlan","v1","fengxing","huashu","baofeng","baiduvideo"
const platformArr = ["youku","iqiyi","le","tencent","meipai","toutiao","miaopai","bili","souhu","kuaibao"]
// 接口描述
const urlDescArr = ["Expr","list","videos","info","total","play","total","user","_user","Desc","view","comment","commentNum","vidTag","digg","field","userId"]
// 错误类型 responseErr resultErr doWithResErr domBasedErr
 const judgeIsErr = (result,n) => {
    let results = JSON.parse(result[n]),
        platform = results["platform"],
        urlDesc = results["urlDesc"],
        fstTime = results["firstTime"],
        lastTime = results["lastTime"],
        succTimes = (+result[4]),
        errTimes = results["times"]
    // 无成功记录
    // platform url urlDesc bid errDesc  firstTime times lastTime
    if(!result[4] 
        && (Number(lastTime) - Number(fstTime) >= 60*60*1000)){
        emailServerLz.sendAlarm(`接口监控：${platform}平台${urlDesc}接口一小时内无成功记录`,`${platform}平台${urlDesc}接口一小时内无成功记录`)
    }
    // 有成功记录，失败次数与成功次数作比较
    if(result[4]){
        let resultZero = JSON.parse(result[0])
        // 如果有responseErr
        if(resultZero){
            //错误描述含有TIMEOUT字段，超时率过80%，发报错邮件
            if(errTimes/(errTimes + succTimes) > 0.8
            && (Number(lastTime) - Number(fstTime) >= 60*60*1000)){
                let resultZeroFstTime = new Date(resultZero.firstTime),
                    resultZeroLastTime = new Date(resultZero.lastTime),
                    resultZeroErrDesc = JSON.stringify(resultZero.errDesc),
                    errDescript = (results["errDesc"] 
                            && results["errDesc"]["code"] 
                            && results["errDesc"]["code"] == "ESOCKETTIMEDOUT" || "ETIMEDOUT") 
                            ? "请求超时" : "接口报错"
                    emailContentsZ =  `<p>平台：${resultZero.platform}</p>
                                      <p>接口：${resultZero.url}</p>
                                      <p>接口功能描述：${resultZero.urlDesc}</p>
                                      <p>账号id：${resultZero.bid}</p>
                                      <p>错误描述：${resultZeroErrDesc}</p>
                                      <p>首次发生时间：${resultZeroFstTime}</p>
                                      <p>最后一次发生时间：${resultZeroLastTime}</p>
                                      <p>错误发生次数：${resultZero.times}</p>
                                      <p>请求成功次数：${succTimes}</p>`
                emailServerLz.sendAlarm(`接口监控：${resultZero.platform}平台${resultZero.urlDesc}接口${errDescript}`,emailContentsZ)
            }
        } else {
            // 如果不是responseErr,一小时内错误率达到30%则邮件报错
            if(errTimes/(errTimes + succTimes) > 0.3 
                && (Number(lastTime) - Number(fstTime) >= 60*60*1000)){
                let resultN = JSON.parse(result[n]),
                resultNFstTime = new Date(resultN.firstTime),
                resultNLastTime = new Date(resultN.lastTime),
                resultNLasErrDesc = JSON.stringify(resultN.errDesc),
                emailContentsN =  `<p>平台：${resultN.platform}</p>
                                    <p>接口：${resultN.url}</p>
                                    <p>接口功能描述：${resultN.urlDesc}</p>
                                    <p>账号id：${resultN.bid}</p>
                                    <p>错误描述：${resultNLasErrDesc}</p>
                                    <p>首次发生时间：${resultNFstTime}</p>
                                    <p>最后一次发生时间：${resultNLastTime}</p>
                                    <p>错误发生次数：${resultN.times}</p>
                                    <p>请求成功次数：${succTimes}</p>`,
                errDescMail
                logger.debug("n====================",n)
                if(result[1]){
                    errDescMail = "返回值错误"
                }else if(2){
                    errDescMail = "返回值解析错误"
                }else if(3){
                    errDescMail = "dom错误"
                }
                emailServerLz.sendAlarm(`接口监控：${resultN.platform}平台${resultN.urlDesc}接口${resultNLasErrDesc}`,emailContentsN)
            }
            
        }
    }
} 
const _getKeys = () => {
    let keys,i,j,keyName
    for(i = 0; i < platformArr.length; i++){
        for(j = 0; j < urlDescArr.length; j++){
            keys = `${platformArr[i]}:${urlDescArr[j]}`
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
                logger.debug("result==================",result)
                if(result[0]){
                    judgeIsErr(result,0)
                }
                // resultErr错误类型,一段时间内发生几率
                if(result[1]){   
                    judgeIsErr(result,1)
                }
                // doWithResErr错误类型，一段时间内发生几率
                if(result[2]){
                    judgeIsErr(result,2)
                }
                // domBasedErr错误类型，一段时间内发生几率
                if(result[3]){
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
    errReadRule.second = [1]
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