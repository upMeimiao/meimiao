const schedule = require('node-schedule')
const emailServerLz = require('./emailServerLz')
const Redis = require('ioredis')
const moment = require('moment')
const logging = require( 'log4js' )
const logger = logging.getLogger('接口监控')
const async = require('async')
const mSpiderClient = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/7`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})

exports.start = () => {
    const errReadRule = new schedule.RecurrenceRule()
        errReadRule.second = [1]
    schedule.scheduleJob(errReadRule, () =>{
        _errorJudge(()=>{
            logger.debug("开始错误分析~")
        })
    })
}
const _errorJudge = (callback) => {
    async.parallel(
        {
            youku: (callback) => {
                getYoukuError()
                callback()
            },
            iqiyi: (callback) => {
                getIqiyiError()
                callback()
            },
            le: (callback) => {
                getLeError()
                callback()
            }
        },
        ( err, result ) => {
            if(err){
                return callback()
            }
            callback()
        }
    )
}
const getIqiyiError = () => {
    let urlDescArr = ["user","total","_user","list","ids","info","Expr","play","comment"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("iqiyi",urlDesc)
    }
}
const getLeError = () => {
    let urlDescArr = ["list","total","Expr","info","Desc"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("le",urlDesc)
    }  
}
const getYoukuError = () => {
    let urlDescArr = ["user","total","videos","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("youku",urlDesc)
    }  
}
const getErr = (platform,urlDesc) => {
    let nowDate = new Date(),
        hour = nowDate.getHours(),
        hourStr,
        times,
        readHour
    if(hour == 0){
        readHour = 23
    } else{
        readHour = hour - 1
    }
    if(readHour >= 10){
        hourStr = "" + readHour
    }else{
        hourStr = "0" + readHour
    }
    let curKey = `apiMonitor:${platform}:${urlDesc}:error:${hourStr}`,
        i
    mSpiderClient.hkeys(curKey,(err,result) => {
        if(err){
            logger.debug("读取redis发生错误")
            return
        }
        if(!result){
            return
        }
        for(i = 0; i < result.length; i++){
            let curUrl = result[i]
            // 获取当前接口对应的错误记录
            mSpiderClient.hget(curKey,curUrl,(err,result) => {
                logger.debug("获取当前接口对应的错误记录=",curKey,curUrl,result)
                if(err){
                    logger.debug("读取redis发生错误")
                    return
                }
                let　 errResult = result,
                      options
                // 获取当前url对应的全部请求次数
                logger.debug("errResult~~~~~~~~~~~~~~~~~",errResult)
                mSpiderClient.hget(`apiMonitor:${platform}:${urlDesc}:total:${hourStr}`,curUrl,(err,result) => {
                    logger.debug("获取当前url对应的全部请求次数=",curKey,curUrl,result)
                    if(err){
                        logger.debug("读取redis发生错误")
                        return
                    }
                    if(!result){
                        logger.debug(`暂无${platform}:${urlDesc}:${curUrl}的请求记录`)
                        return
                    }
                    options = {
                        "curUrl": curUrl,
                        "urlDesc": urlDesc,
                        "hourStr": hourStr,
                        "result": errResult,
                        "totalResult": (+result)
                    }
                    logger.debug("~~~~~~~~~~~~~~~~~~~~~~~~options",options)
                    switch(platform){
                        case "youku":
                            youkuJudgeErr(options)
                            break
                        case "iqiyi":
                            iqiyiJudgeErr(options)
                            break
                        case "le":
                            leJudgeErr(options)
                            break
                    }
                })
            })
        }
    })
}  
const youkuJudgeErr = (options) => {
    logger.debug("youkuJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "youku",
            "urlDesc": "",
            "curUrl": options.curUrl,
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "user":
            emailOptions.urlDesc = "user"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
}
const judgeResults = (options,emailOptions,numberArr) => {
    logger.debug("judgeResults  options=================",options)
    let resultObj = JSON.parse(options.result)
    logger.debug(resultObj.responseErr.times,
                resultObj.resultErr.times,
                resultObj.doWithResErr.times,
                resultObj.domBasedErr.times,
                resultObj.timeoutErr.times,
                options.totalResult)
    if(!options.totalResult || options.totalResult < 2){
        return
    }
    if(resultObj.responseErr.times 
        && resultObj.responseErr.times/(+options.totalResult) > numberArr[0]){
        //平台 接口描述 接口 错误类型  错误描述 发生时间 出错次数  共访问次数
        emailOptions.errType = "responseErr"
        emailOptions.errTimes = resultObj.responseErr.times
        emailOptions.errDesc = resultObj.responseErr.desc
        sendWarnEmail(emailOptions)
        return
    } else if(resultObj.resultErr.times 
        && resultObj.resultErr.times/(+options.totalResult) > numberArr[1]){
        emailOptions.errType = "resultErr"
        emailOptions.errTimes = resultObj.resultErr.times
        emailOptions.errDesc = resultObj.resultErr.desc
        sendWarnEmail(emailOptions)
        return
    } else if(resultObj.doWithResErr.times 
        && resultObj.doWithResErr.times/(+options.totalResult) > numberArr[2]){
        emailOptions.errType = "doWithResErr"
        emailOptions.errTimes = resultObj.doWithResErr.times
        emailOptions.errDesc = resultObj.doWithResErr.desc
        sendWarnEmail(emailOptions)
        return
    } else if(resultObj.domBasedErr.times 
        && resultObj.domBasedErr.times/(+options.totalResult) > numberArr[3]){
        emailOptions.errType = "domBasedErr"
        emailOptions.errTimes = resultObj.domBasedErr.times
        emailOptions.errDesc = resultObj.domBasedErr.desc
        sendWarnEmail(emailOptions)
        return
    } else if(resultObj.timeoutErr.times 
        && resultObj.timeoutErr.times/(+options.totalResult) > numberArr[4]){
        emailOptions.errType = "timeoutErr"
        emailOptions.errTimes = resultObj.timeoutErr.times
        emailOptions.errDesc = resultObj.timeoutErr.desc
        sendWarnEmail(emailOptions)
        return
    }
}
const sendWarnEmail = (emailOptions) => {
    logger.debug("sendWarnEmail~~~!!!!!!!!!!!!!!!!!!!!!!emailOptions=",emailOptions)
    let subject = `接口监控：${emailOptions.platform}平台${emailOptions.urlDesc}接口${emailOptions.errDesc}`,
        url = decodeURIComponent(emailOptions.curUrl),
        content = `<p>平台：${emailOptions.platform}</p>
                    <p>接口功能描述：${emailOptions.urlDesc}</p>
                    <p>接口：${url}</p>
                    <p>账号id：${emailOptions.bid}</p>
                    <p>错误描述：${emailOptions.errDesc}</p>
                    <p>错误发生时间：今天${emailOptions.hourStr}时</p>
                    <p>错误发生次数：${emailOptions.errTimes}</p>
                    <p>接口请求总次数：${emailOptions.totalTimes}</p>`
    emailServerLz.sendAlarm(subject,content)
}
const iqiyiJudgeErr = (options) => {
    logger.debug("iqiyiJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "iqiyi",
            "urlDesc": "",
            "curUrl": options.curUrl,
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
        //["user","total","_user","list","ids","info","Expr","play","comment"]
    switch(options.urlDesc){
        case "user":
            emailOptions.urlDesc = "user"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "_user":
            emailOptions.urlDesc = "_user"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
        case "ids":
            emailOptions.urlDesc = "ids"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "play":
            emailOptions.urlDesc = "play"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break 
        case "comment":
            emailOptions.urlDesc = "comment"
            judgeResults(options,emailOptions,numberArr)
            break 
    }
}
const leJudgeErr = (options) => {
    logger.debug("leJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "le",
            "urlDesc": "",
            "curUrl": options.curUrl,
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
        //["list","total","Expr","info","Desc"]
    switch(options.urlDesc){
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
        case "Desc":
            emailOptions.urlDesc = "Desc"
            numberArr = [0.3,0.3,0.3,0.3,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}