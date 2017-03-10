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
    //读取已存的错误，生成错误表
    const errSetRule = new schedule.RecurrenceRule()
        errSetRule.minute = [5,10,15,20,25,30,35,40,45,50,55]
    schedule.scheduleJob(errSetRule, () =>{
        _errorJudge(()=>{
            logger.debug("开始错误读取与分析~")
        })
    })
    const errReadRule = new schedule.RecurrenceRule()
        errReadRule.minute = [15,30,45,59]
    schedule.scheduleJob(errReadRule, () =>{
        sendWarnEmail(()=>{
            logger.debug("开始读取错误列表发送邮件~")
        })
    })
}
const setWarnErrTable = (emailOptions) => {
    let key = `apiMonitor:warnTable:${emailOptions.hourStr}`,
        field = `${emailOptions.platform}_${emailOptions.urlDesc}_${emailOptions.errType}`
        mSpiderClient.hset(key,field,JSON.stringify(emailOptions),(err,result) => {
            if(err){
                return
            }
        })
}
const sendWarnEmail = (callback) => {
    let newDate = new Date(),
        hour = newDate.getHours()
        if(hour < 10){
            hour = "0" + hour
        } else{
            hour = "" + hour
        }
    let  key = `apiMonitor:warnTable:${hour}`
    //获取所有的key
    mSpiderClient.hkeys(key,(err,result) => {
        if(err){
            logger.debug("连接redis数据库出错")
            return
        }  
        if(!result){
            logger.debug("暂无错误报警")
            return
        }
        let newDate = new Date(),
            year = newDate.getFullYear(),
            month = newDate.getMonth() + 1,
            day = newDate.getDate(),
            hour = newDate.getHours(),hourStr,content,
            platform,bid,urlDesc,totalTimes,errObj,
            errType
        if(hour >= 10){
            hourStr = "" + hour
        }else{
            hourStr = "0" + hour
        }
        let subject = `接口监控：${year}年${month}月${day}日 ${hourStr}时接口报警报表`,
            tableBody,j,length = result.length,index = 0,
            tableHead = `<tr><td>平台</td><td>账号id</td><td>接口描述</td><td>错误类型</td><td>错误描述</td><td>错误次数</td><td>接口总请求次数</td></tr>`
        //遍历key，获取所有错误信息，发送邮件
        for(j = 0; j < length; j++){
            mSpiderClient.hget(key,result[j],(err,result) => {
                result = JSON.parse(result)
                // logger.debug("resultJ====================",resultJ)
                platform = result["platform"]
                bid = result["bid"]
                urlDesc = result["urlDesc"]
                totalTimes = result["totalTimes"]
                errObj = result["errObj"]
                errType = result["errType"]
                errDesc = JSON.stringify(result["errDesc"])
                errTimes = result["errTimes"]
                tableBody += `<tr><td>${platform}</td><td>${bid}</td><td>${urlDesc}</td><td>${errType}</td><td>${errDesc}</td><td>${errTimes}</td><td>${totalTimes}</td></tr>`
                content = `<table style= 'border-collapse:collapse;border:1px solid #333;'>${subject}${tableHead}${tableBody}</table>`
                // logger.debug("subject content++++++++++++++++++++++++++++++++++++",subject,content)
                emailServerLz.sendAlarm(subject,content)
            })
        }
    })
}
const getErr = (platform,urlDesc) => {
    // logger.debug("进入getErr")
    let nowDate = new Date(),
        hour = nowDate.getHours(),
        hourStr,
        times
    if(hour >= 10){
        hourStr = "" + hour
    }else{
        hourStr = "0" + hour
    }
    let curKey = `apiMonitor:error:${platform}:${urlDesc}:${hourStr}`,
        i
    // mSpiderClient.keys(curKey,(err,result) => {
    //     if(err){
    //         logger.debug("读取redis发生错误")
    //         return
    //     }
    //     if(!result){
    //         return
    //     }
    //     // logger.debug("curKey result",curKey,result)
    //     for(i = 0; i < result.length; i++){
            // let urls = result[i]
            // 获取当前接口对应的错误记录
            mSpiderClient.get(curKey,(err,result) => {
                logger.debug("获取当前接口对应的错误记录=",curKey,result)
                if(err){
                    logger.debug("读取redis发生错误")
                    return
                }
                if(!result){
                    logger.debug(`暂无${platform}:${urlDesc}的错误记录`)
                    return
                }
                let　 errResult = result,
                      options
                // 获取当前url对应的全部请求次数
                // logger.debug("errResult~~~~~~~~~~~~~~~~~",errResult)
                mSpiderClient.hget(`apiMonitor:all`,`${platform}_${urlDesc}_${hourStr}`,(err,result) => {
                    logger.debug("获取当前url对应的全部请求次数=",curKey,result)
                    if(err){
                        logger.debug("读取redis发生错误")
                        return
                    }
                    if(!result){
                        logger.debug(`暂无${platform}:${urlDesc}的请求记录`)
                        return
                    }
                    options = {
                        "urlDesc": urlDesc,
                        "hourStr": hourStr,
                        "result": errResult,
                        "totalResult": (+result)
                    }
                    // logger.debug("~~~~~~~~~~~~~~~~~~~~~~~~options",options)
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
                        case "baomihua":
                            baomihuaJudgeErr(options)
                            break
                        case "ku6":
                            kusixJudgeErr(options)
                            break
                        case "btime":
                            btimeJudgeErr(options)
                            break
                        case "weishi":
                            weishiJudgeErr(options)
                            break
                        case "xiaoying":
                            xiaoyingJudgeErr(options)
                            break
                        case "budejie":
                            budejieJudgeErr(options)
                            break
                        case "neihan":
                            neihanJudgeErr(options)
                            break
                        case "yy":
                            yyJudgeErr(options)
                            break
                        case "tv56":
                            tv56JudgeErr(options)
                            break
                        case "acfun":
                            acfunJudgeErr(options)
                            break
                        case "weibo":
                            weiboJudgeErr(options)
                            break
                        case "ifeng":
                            ifengJudgeErr(options)
                            break
                        case "wangyi":
                            wangyiJudgeErr(options)
                            break
                        case "uctt":
                            ucttJudgeErr(options)
                            break
                        case "mgtv":
                            mgtvJudgeErr(options)
                            break
                        case "baijia":
                            baijiaJudgeErr(options)
                            break
                        case "qzone":
                            qzoneJudgeErr(options)
                            break
                        case "cctv":
                            cctvJudgeErr(options)
                            break
                        case "pptv":
                            pptvJudgeErr(options)
                            break
                        case "xinlan":
                            xinlanJudgeErr(options)
                            break
                        case "v1":
                            v1JudgeErr(options)
                            break
                        case "fengxing":
                            fengxingJudgeErr(options)
                            break
                        case "huashu":
                            huashuJudgeErr(options)
                            break
                        case "baofeng":
                            baofengJudgeErr(options)
                            break
                        case "baiduvideo":
                            baiduvideoJudgeErr(options)
                            break
                    }
                })
            })
        // }
    // })
} 
const judgeResults = (options,emailOptions,numberArr) => {
    // logger.debug("judgeResults  options=================",options)
    let resultObj = JSON.parse(options.result)
    // logger.debug(resultObj.responseErr.times,
    //             resultObj.resultErr.times,
    //             resultObj.doWithResErr.times,
    //             resultObj.domBasedErr.times,
    //             resultObj.timeoutErr.times,
    //             options.totalResult)
    if(!options.totalResult || options.totalResult < 2){
        return
    }
    if(resultObj.responseErr.times 
        && resultObj.responseErr.times/(+options.totalResult) > numberArr[0]){
        //平台 接口描述 接口 错误类型  错误描述 发生时间 出错次数  共访问次数
        emailOptions.errType = "responseErr"
        emailOptions.errTimes = resultObj.responseErr.times
        emailOptions.errDesc = resultObj.responseErr.desc
        emailOptions.urls = resultObj.responseErr.errUrls
        setWarnErrTable(emailOptions)
        return
    } else if(resultObj.resultErr.times 
        && resultObj.resultErr.times/(+options.totalResult) > numberArr[1]){
        emailOptions.errType = "resultErr"
        emailOptions.errTimes = resultObj.resultErr.times
        emailOptions.errDesc = resultObj.resultErr.desc
        emailOptions.urls = resultObj.resultErr.errUrls
        setWarnErrTable(emailOptions)
        return
    } else if(resultObj.doWithResErr.times 
        && resultObj.doWithResErr.times/(+options.totalResult) > numberArr[2]){
        emailOptions.errType = "doWithResErr"
        emailOptions.errTimes = resultObj.doWithResErr.times
        emailOptions.errDesc = resultObj.doWithResErr.desc
        emailOptions.urls = resultObj.doWithResErr.errUrls
        setWarnErrTable(emailOptions)
        return
    } else if(resultObj.domBasedErr.times 
        && resultObj.domBasedErr.times/(+options.totalResult) > numberArr[3]){
        emailOptions.errType = "domBasedErr"
        emailOptions.errTimes = resultObj.domBasedErr.times
        emailOptions.errDesc = resultObj.domBasedErr.desc
        emailOptions.urls = resultObj.domBasedErr.errUrls
        setWarnErrTable(emailOptions)
        return
    } else if(resultObj.timeoutErr.times 
        && resultObj.timeoutErr.times/(+options.totalResult) > numberArr[4]){
        emailOptions.errType = "timeoutErr"
        emailOptions.errTimes = resultObj.timeoutErr.times
        emailOptions.errDesc = resultObj.timeoutErr.desc
        emailOptions.urls = resultObj.timeoutErr.errUrls
        setWarnErrTable(emailOptions)
        return
    } else if(resultObj.playNumErr.times){
        emailOptions.errType = "playNumErr"
        emailOptions.errTimes = resultObj.playNumErr.times
        emailOptions.errDesc = resultObj.playNumErr.desc
        emailOptions.urls = resultObj.playNumErr.errUrls
        setWarnErrTable(emailOptions)
        return
    } else if(resultObj.statusErr.times 
        && resultObj.statusErr.times/(+options.totalResult) > numberArr[5]){
        emailOptions.errType = "statusErr"
        emailOptions.errTimes = resultObj.statusErr.times
        emailOptions.errDesc = resultObj.statusErr.desc
        emailOptions.urls = resultObj.statusErr.errUrls
        setWarnErrTable(emailOptions)
        return
    }
}
const _errorJudge = (callback) => {
    // logger.debug("进入_errorJudge")
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
            },
            baomihua: (callback) => {
                getBaomihuaError()
                callback()
            },
            ku6: (callback) => {
                getKusixError()
                callback()
            },
            btime: (callback) => {
                getBtimeError()
                callback()
            },
            weishi: (callback) => {
                getWeishiError()
                callback()
            },
            xiaoying: (callback) => {
                getXiaoyingError()
                callback()
            },
            budejie: (callback) => {
                getBudejieError()
                callback()
            },
            neihan: (callback) => {
                getNeihanError()
                callback()
            },
            yy: (callback) => {
                getYyError()
                callback()
            },
            tv56: (callback) => {
                getTv56Error()
                callback()
            },
            acfun: (callback) => {
                getAcfunError()
                callback()
            },
            weibo: (callback) => {
                getWeiboError()
                callback()
            },
            ifeng: (callback) => {
                getIfengError()
                callback()
            },
            wangyi: (callback) => {
                getWangyiError()
                callback()
            },
            uctt: (callback) => {
                getUcttError()
                callback()
            },
            mgtv: (callback) => {
                getMgtvError()
                callback()
            },
            baijia: (callback) => {
                getBaijiaError()
                callback()
            },
            qzone: (callback) => {
                getQzoneError()
                callback()
            },
            cctv: (callback) => {
                getCctvError()
                callback()
            },
            pptv: (callback) => {
                getPptvError()
                callback()
            },
            xinlan: (callback) => {
                getXinlanError()
                callback()
            },
            v1: (callback) => {
                getV1Error()
                callback()
            },
            fengxing: (callback) => {
                getFengxingError()
                callback()
            },
            huashu: (callback) => {
                getHuashuError()
                callback()
            },
            baofeng: (callback) => {
                getBaofengError()
                callback()
            },
            baiduvideo: (callback) => {
                getBaiduvideoError()
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
const getBaiduvideoError = () => {
    // logger.debug("getBaiduvideoError")
    let urlDescArr = ["total","list","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("baiduvideo",urlDesc)
    }
}
const getBaofengError = () => {
    // logger.debug("getBaofengError")
    let urlDescArr = ["theAlbum","list","desc","support","comment"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("baofeng",urlDesc)
    }
}
const getHuashuError = () => {
    // logger.debug("getHuashuError")
    let urlDescArr = ["vidList","videoList","info","comment","play"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("huashu",urlDesc)
    }
}
const getFengxingError = () => {
    // logger.debug("getFengxingError")
    let urlDescArr = ["video","fans","list","info","creatTime","comment"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("fengxing",urlDesc)
    }
}
const getV1Error = () => {
    // logger.debug("getV1Error")
    let urlDescArr = ["fans","total","list","suport","videoInfo","vidInfo"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("v1",urlDesc)
    }
}
const getXinlanError = () => {
    // logger.debug("getXinlanError")
    let urlDescArr = ["list","save","suport","comment","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("xinlan",urlDesc)
    }
}
const getPptvError = () => {
    // logger.debug("getPptvError")
    let urlDescArr = ["list","total","info"]
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("pptv",urlDesc)
    }
}
const getCctvError = () => {
    // logger.debug("getCctvError")
    let urlDescArr = ["fans","total","list","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("cctv",urlDesc)
    }
}
const getQzoneError = () => {
    // logger.debug("getQzoneError")
    let urlDescArr = ["fan","list","info","comment"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("qzone",urlDesc)
    }
}
const getBaijiaError = () => {
    // logger.debug("getBaijiaError")
    let urlDescArr = ["toal","fan","list","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("baijia",urlDesc)
    }
}
const getMgtvError = () => {
    // logger.debug("getMgtvError")
    let urlDescArr = ["list","commentNum","like","desc","class","play","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("mgtv",urlDesc)
    }
}
const getUcttError = () => {
    // logger.debug("getUcttError")
    let urlDescArr = ["list","info","commentNum","desc"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("uctt",urlDesc)
    }
}
const getWangyiError = () => {
    // logger.debug("getWangyiError")
    let urlDescArr = ["user","list","video","play"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("wangyi",urlDesc)
    }
}
const getIfengError = () => {
    // logger.debug("getIfengError")
    let urlDescArr = ["total","list","video"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("ifeng",urlDesc)
    }
}
const getWeiboError = () => {
    // logger.debug("getAcfunError")
    let urlDescArr = ["user","total","list","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("weibo",urlDesc)
    }
}
const getAcfunError = () => {
    // logger.debug("getAcfunError")
    let urlDescArr = ["user","total","list"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("acfun",urlDesc)
    }
}
const getTv56Error = () => {
    // logger.debug("getTv56Error")
    let urlDescArr = ["user","total","videos","info","comment"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("tv56",urlDesc)
    }
}
const getYyError = () => {
    // logger.debug("getYyError")
    let urlDescArr = ["total","live","slist","dlist","list"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("yy",urlDesc)
    }
}
const getNeihanError = () => {
    // logger.debug("getNeihanError")
    let urlDescArr = ["user","list"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("neihan",urlDesc)
    }
}
const getBudejieError = () => {
    // logger.debug("getBudejieError")
    let urlDescArr = ["user","list"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("budejie",urlDesc)
    }
}
const getXiaoyingError = () => {
    // logger.debug("getXiaoyingError")
    let urlDescArr = ["info","list","total"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("xiaoying",urlDesc)
    }
}
const getWeishiError = () => {
    // logger.debug("getWeishiError")
    let urlDescArr = ["user","list"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("weishi",urlDesc)
    }
}
const getBtimeError = () => {
    // logger.debug("getBtimeError")
    let urlDescArr = ["user","list","info","comment"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("btime",urlDesc)
    }
}
const getKusixError = () => {
    // logger.debug("getKusixError")
    let urlDescArr = ["user","total","list"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("ku6",urlDesc)
    }
}
const getBaomihuaError = () => {
    // logger.debug("getBaomihuaError")
    let urlDescArr = ["user","list","Expr","playNum","ExprPC"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("baomihua",urlDesc)
    }
}
const getTudouError = () => {
    // logger.debug("getTudouError")
    let urlDescArr = ["user","fans","total","list","videoTime","Expr"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("tudou",urlDesc)
    }
}
const getYidianError = () => {
    // logger.debug("getYidianError")
    let urlDescArr = ["user","interestId","list"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("yidian",urlDesc)
    }
}
const getSouhuError = () => {
    // logger.debug("进入getSouhuError")
    let urlDescArr = ["user","total","list","info","commentNum"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("souhu",urlDesc)
    }
}
const getKuaibaoError = () => {
    // logger.debug("进入getKuaibaoError")
    let urlDescArr = ["user","videos","info","commentNum","Expr","play","field"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("kuaibao",urlDesc)
    }
}
const getMeipaiError = () => {
    // logger.debug("进入getMeipaiError")
    let urlDescArr = ["user","total","videos","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("meipai",urlDesc)
    }
}
const getMiaopaiError = () => {
    // logger.debug("进入getMiaopaiError")
    let urlDescArr = ["user","total","videos","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("miaopai",urlDesc)
    }
}
const getToutiaoError = () => {
    // logger.debug("进入getToutiaoError")
    let urlDescArr = ["user","userId","list","play"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("toutiao",urlDesc)
    }
}
const getIqiyiError = () => {
    // logger.debug("进入getIqiyiError")
    let urlDescArr = ["user","total","_user","list","ids","info","Expr","play","comment"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("iqiyi",urlDesc)
    }
}
const getLeError = () => {
    // logger.debug("进入getLeError")
    let urlDescArr = ["list","total","Expr","info","Desc"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("le",urlDesc)
    }  
}
const getTencentError = () => {
    // logger.debug("进入getTencentError")
    let urlDescArr = ["total","user","list","view","comment","commentNum","vidTag"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("tencent",urlDesc)
    }  
}
const getYoukuError = () => {
    // logger.debug("进入getYoukuError")
    let urlDescArr = ["user","total","videos","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("youku",urlDesc)
    }  
}
const getBiliError = () => {
    // logger.debug("进入getBiliError")
    let urlDescArr = ["user","total","videos","info"],
        urlDesc,i
    for(i = 0; i < urlDescArr.length; i++){
        urlDesc = urlDescArr[i]
        getErr("bili",urlDesc)
    }  
}
const baiduvideoJudgeErr = (options) => {
    //["total","list","info"]
    // logger.debug("baiduvideoJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "baiduvideo",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const baofengJudgeErr = (options) => {
    // ["theAlbum","list","desc","support","comment"]
    // logger.debug("baofengJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "baofeng",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "theAlbum":
            emailOptions.urlDesc = "theAlbum"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "desc":
            emailOptions.urlDesc = "desc"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "support":
            emailOptions.urlDesc = "support"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "comment":
            emailOptions.urlDesc = "comment"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const huashuJudgeErr = (options) => {
    //["vidList","videoList","info","comment","play"]
    // logger.debug("huashuJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "huashu",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "vidList":
            emailOptions.urlDesc = "vidList"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videoList":
            emailOptions.urlDesc = "videoList"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "comment":
            emailOptions.urlDesc = "comment"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "play":
            emailOptions.urlDesc = "play"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const fengxingJudgeErr = (options) => {
    //["","",""]
    // logger.debug("fengxingJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "fengxing",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "video":
            emailOptions.urlDesc = "video"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "fans":
            emailOptions.urlDesc = "fans"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "creatTime":
            emailOptions.urlDesc = "creatTime"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "comment":
            emailOptions.urlDesc = "comment"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const v1JudgeErr = (options) => {
    //["","",""]
    // logger.debug("v1JudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "v1",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "fans":
            emailOptions.urlDesc = "fans"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "support":
            emailOptions.urlDesc = "support"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "comment":
            emailOptions.urlDesc = "comment"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const xinlanJudgeErr = (options) => {
    //["","",""]
    // logger.debug("xinlanJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "xinlan",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "save":
            emailOptions.urlDesc = "save"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "suport":
            emailOptions.urlDesc = "suport"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "comment":
            emailOptions.urlDesc = "comment"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const pptvJudgeErr = (options) => {
    //["","",""]
    // logger.debug("pptvJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "pptv",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const cctvJudgeErr = (options) => {
    //["","",""]
    // logger.debug("cctvJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "cctv",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "fans":
            emailOptions.urlDesc = "fans"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "toal":
            emailOptions.urlDesc = "toal"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const qzoneJudgeErr = (options) => {
    //["","",""]
    // logger.debug("qzoneJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "qzone",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "fan":
            emailOptions.urlDesc = "fan"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "fan":
            emailOptions.urlDesc = "fan"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const baijiaJudgeErr = (options) => {
    //["","",""]
    // logger.debug("baijiaJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "baijia",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "fan":
            emailOptions.urlDesc = "fan"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const mgtvJudgeErr = (options) => {
    //["","",""]
    // logger.debug("mgtvJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "mgtv",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "commentNum":
            emailOptions.urlDesc = "commentNum"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "like":
            emailOptions.urlDesc = "like"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "desc":
            emailOptions.urlDesc = "desc"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "class":
            emailOptions.urlDesc = "class"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "play":
            emailOptions.urlDesc = "play"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const ucttJudgeErr = (options) => {
    //["","",""]
    // logger.debug("ucttJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "uctt",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "commentNum":
            emailOptions.urlDesc = "commentNum"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "desc":
            emailOptions.urlDesc = "desc"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const wangyiJudgeErr = (options) => {
    //["","",""]
    // logger.debug("wangyiJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "wangyi",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "video":
            emailOptions.urlDesc = "video"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "paly":
            emailOptions.urlDesc = "paly"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const ifengJudgeErr = (options) => {
    //["","",""]
    // logger.debug("ifengJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "ifeng",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "video":
            emailOptions.urlDesc = "video"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const weiboJudgeErr = (options) => {
    //["","",""]
    // logger.debug("weiboJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "weibo",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const acfunJudgeErr = (options) => {
    //["","",""]
    // logger.debug("acfunJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "acfun",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const tv56JudgeErr = (options) => {
    //["user","total","videos","info","comment"]
    // logger.debug("tv56JudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "tv56",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "comment":
            emailOptions.urlDesc = "comment"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const yyJudgeErr = (options) => {
    //["total","live","slist","dlist","list"]
    // logger.debug("yyJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "yy",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "live":
            emailOptions.urlDesc = "live"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "slist":
            emailOptions.urlDesc = "slist"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "dlist":
            emailOptions.urlDesc = "dlist"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const neihanJudgeErr = (options) => {
    //["","",""]
    // logger.debug("neihanJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "neihan",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const budejieJudgeErr = (options) => {
    //["","",""]
    // logger.debug("budejieJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "budejie",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
} 
const xiaoyingJudgeErr = (options) => {
    //["info","list","total"]
    // logger.debug("xiaoyingJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "xiaoying",
            "urlDesc": "",
            "urls": "",
            "bid": errObj.bid,
            "errType": "",
            "errDesc": "",
            "hourStr": options.hourStr,
            "errTimes": "",
            "totalTimes": options.totalResult
        },
        numberArr
    switch(options.urlDesc){
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}
const weishiJudgeErr = (options) => {
    //
    // logger.debug("weishiJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "weishi",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}
const btimeJudgeErr = (options) => {
    //["user","list","info","comment"]
    // logger.debug("btimeJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "btime",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "comment":
            emailOptions.urlDesc = "comment"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}
const kusixJudgeErr = (options) => {
    //
    // logger.debug("kusixJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "ku6",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}
const baomihuaJudgeErr = (options) => {
    //["user","list","Expr","playNum","ExprPC"]
    // logger.debug("baomihuaJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "baomihua",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "ExprPC":
            emailOptions.urlDesc = "ExprPC"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "playNum":
            emailOptions.urlDesc = "playNum"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}
const tudouJudgeErr = (options) => {
    //["user","fans","total","list","videoTime","Expr"]
    // logger.debug("yidianJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "tudou",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "fans":
            emailOptions.urlDesc = "fans"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videoTime":
            emailOptions.urlDesc = "videoTime"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}
const yidianJudgeErr = (options) => {
    //user interestId list
    // logger.debug("yidianJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "yidian",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "interestId":
            emailOptions.urlDesc = "interestId"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}
const tencentJudgeErr = (options) => {
    //["total","user","list","view","comment","commentNum","vidTag"]
    // logger.debug("tencentJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "tencent",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "user":
            emailOptions.urlDesc = "user"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "view":
            emailOptions.urlDesc = "view"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "comment":
            emailOptions.urlDesc = "comment"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "commentNum":
            emailOptions.urlDesc = "commentNum"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break 
        case "vidTag":
            emailOptions.urlDesc = "vidTag"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break   
    }
}
const kuaibaoJudgeErr = (options) => {
    //["user","videos","info","commentNum","Expr","play","field"]
    // logger.debug("kuaibaoJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "kuaibao",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "commentNum":
            emailOptions.urlDesc = "commentNum"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "play":
            emailOptions.urlDesc = "play"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break 
        case "field":
            emailOptions.urlDesc = "field"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break   
    }
}
const souhuJudgeErr = (options) => {
    // logger.debug("souhuJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "souhu",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
        case "commentNum":
            emailOptions.urlDesc = "commentNum"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
    }
}
const toutiaoJudgeErr = (options) => {
    // logger.debug("toutiaoJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "toutiao",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "userId":
            emailOptions.urlDesc = "userId"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "play":
            emailOptions.urlDesc = "play"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
}
const meipaiJudgeErr = (options) => {
    // logger.debug("meipaiJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "meipai",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
}
const miaopaiJudgeErr = (options) => {
    // logger.debug("miaopaiJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "miaopai",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
}
const biliJudgeErr = (options) => {
    // logger.debug("biliJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "bili",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
}
const youkuJudgeErr = (options) => {
    // logger.debug("youkuJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "youku",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "videos":
            emailOptions.urlDesc = "videos"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
    }
}
const iqiyiJudgeErr = (options) => {
    // logger.debug("iqiyiJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "iqiyi",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "_user":
            emailOptions.urlDesc = "_user"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "list":
            emailOptions.urlDesc = "list"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
        case "ids":
            emailOptions.urlDesc = "ids"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break  
        case "play":
            emailOptions.urlDesc = "play"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break 
        case "comment":
            emailOptions.urlDesc = "comment"
            judgeResults(options,emailOptions,numberArr)
            break 
    }
}
const leJudgeErr = (options) => {
    // logger.debug("leJudgeErr  options=================",options)
    let errObj = JSON.parse(options.result),
        emailOptions = {
            "platform": "le",
            "urlDesc": "",
            "urls": "",
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
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "total":
            emailOptions.urlDesc = "total"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "Expr":
            emailOptions.urlDesc = "Expr"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
        case "info":
            emailOptions.urlDesc = "info"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break    
        case "Desc":
            emailOptions.urlDesc = "Desc"
            numberArr = [0.8,0.4,0.4,0.5,0.8,0.8]
            judgeResults(options,emailOptions,numberArr)
            break
    }
}