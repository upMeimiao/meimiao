const schedule = require('node-schedule')
const emailServerLz = require('./emailServerLz')
const Redis = require('ioredis')
const moment = require('moment')
const logging = require( 'log4js' )
const logger = logging.getLogger('接口监控')
const async = require('async')
const mSpiderClient = new Redis(`redis://:C19prsPjHs52CHoA0vm@127.0.0.1:6379/7`,{
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
    logger.debug("进入_errorJudge")
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
            },
            tencent: (callback) => {
                getTencentError()
                callback()
            },
            meipai: (callback) => {
                getMeipaiError()
                callback()
            },
            toutiao: (callback) => {
                getToutiaoError()
                callback()
            },
            miaopai: (callback) => {
                getMiaopaiError()
                callback()
            },
            souhu: (callback) => {
                getSouhuError()
                callback()
            },
            bili: (callback) => {
                getBiliError()
                callback()
            },
            kuaibao: (callback) => {
                getKuaibaoError()
                callback()
            },
            yidian: (callback) => {
                getYidianError()
                callback()
            },
            tudou: (callback) => {
                getTudouError()
                callback()
            }
        },( err, result ) => {
                if(err){
                    return callback()
                }
                callback()
        }
    )
}
const getTudouError = () => {
    logger.debug("getTudouError")
    let urlDescArr = ["user","fans","total","list","videoTime","Expr"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("tudou",urlDesc)
    }
}
const getYidianError = () => {
    logger.debug("getYidianError")
    let urlDescArr = ["user","interestId","list"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("yidian",urlDesc)
    }
}
const getSouhuError = () => {
    logger.debug("进入getSouhuError")
    let urlDescArr = ["user","total","list","info","commentNum"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("souhu",urlDesc)
    }
}
const getKuaibaoError = () => {
    logger.debug("进入getKuaibaoError")
    let urlDescArr = ["user","videos","info","commentNum","Expr","play","field"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("kuaibao",urlDesc)
    }
}
const getMeipaiError = () => {
    logger.debug("进入getMeipaiError")
    let urlDescArr = ["user","total","videos","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("meipai",urlDesc)
    }
}
const getMiaopaiError = () => {
    logger.debug("进入getMiaopaiError")
    let urlDescArr = ["","","",""],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("miaopai",urlDesc)
    }
}
const getToutiaoError = () => {
    logger.debug("进入getToutiaoError")
    let urlDescArr = ["user","userId","list","play"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("toutiao",urlDesc)
    }
}
const getIqiyiError = () => {
    logger.debug("进入getIqiyiError")
    let urlDescArr = ["user","total","_user","list","ids","info","Expr","play","comment"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("iqiyi",urlDesc)
    }
}
const getLeError = () => {
    logger.debug("进入getLeError")
    let urlDescArr = ["list","total","Expr","info","Desc"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("le",urlDesc)
    }  
}
const getTencentError = () => {
    logger.debug("进入getTencentError")
    let urlDescArr = ["total","user","list","view","comment","commentNum","vidTag"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("tencent",urlDesc)
    }  
}
const getYoukuError = () => {
    logger.debug("进入getYoukuError")
    let urlDescArr = ["user","total","videos","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("youku",urlDesc)
    }  
}
const getBiliError = () => {
    logger.debug("进入getBiliError")
    let urlDescArr = ["user","total","videos","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("bili",urlDesc)
    }  
}
const getErr = (platform,urlDesc) => {
    logger.debug("进入getErr")
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
        logger.debug("curKey result",curKey,result)
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
                        case "tencent":
                            tencentJudgeErr(options)
                            break
                        case "meipai":
                            meipaiJudgeErr(options)
                            break
                        case "toutiao":
                            toutiaoJudgeErr(options)
                            break
                        case "miaopai":
                            miaopaiJudgeErr(options)
                            break
                        case "souhu":
                            souhuJudgeErr(options)
                            break
                        case "bili":
                            biliJudgeErr(options)
                            break
                        case "kuaibao":
                            kuaibaoJudgeErr(options)
                            break
                        case "yidian":
                            yidianJudgeErr(options)
                            break
                        case "tudou":
                            tudouJudgeErr(options)
                            break
                    }
                })
            })
        }
    })
}  
const tudouJudgeErr = (options) => {
    //["user","fans","total","list","videoTime","Expr"]
    logger.debug("yidianJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "tudou",
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "fans":
            emailOptions.urlDesc = "fans"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videoTime":
            emailOptions.urlDesc = "videoTime"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}
const yidianJudgeErr = (options) => {
    //user interestId list
    logger.debug("yidianJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "yidian",
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "interestId":
            emailOptions.urlDesc = "interestId"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}
const tencentJudgeErr = (options) => {
    //["total","user","list","view","comment","commentNum","vidTag"]
    logger.debug("tencentJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "tencent",
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
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "user":
            emailOptions.urlDesc = "user"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "view":
            emailOptions.urlDesc = "view"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "comment":
            emailOptions.urlDesc = "comment"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "commentNum":
            emailOptions.urlDesc = "commentNum"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break 
        case "vidTag":
            emailOptions.urlDesc = "vidTag"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break   
    }
}
const kuaibaoJudgeErr = (options) => {
    //["user","videos","info","commentNum","Expr","play","field"]
    logger.debug("kuaibaoJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "kuaibao",
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "commentNum":
            emailOptions.urlDesc = "commentNum"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "play":
            emailOptions.urlDesc = "play"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break 
        case "field":
            emailOptions.urlDesc = "field"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break   
    }
}
const souhuJudgeErr = (options) => {
    logger.debug("souhuJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "souhu",
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
        case "commentNum":
            emailOptions.urlDesc = "commentNum"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
    }
}
const toutiaoJudgeErr = (options) => {
    logger.debug("toutiaoJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "toutiao",
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "userId":
            emailOptions.urlDesc = "userId"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "play":
            emailOptions.urlDesc = "play"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
}
const meipaiJudgeErr = (options) => {
    logger.debug("meipaiJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "meipai",
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
}
const miaopaiJudgeErr = (options) => {
    logger.debug("miaopaiJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "miaopai",
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
}
const biliJudgeErr = (options) => {
    logger.debug("biliJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "bili",
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "_user":
            emailOptions.urlDesc = "_user"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
        case "ids":
            emailOptions.urlDesc = "ids"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "play":
            emailOptions.urlDesc = "play"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
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
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
        case "Desc":
            emailOptions.urlDesc = "Desc"
            numberArr = [0.4,0.4,0.4,0.4,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}