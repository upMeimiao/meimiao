const moment = require("moment")
const platformMap = {
    "1": "youku",
    "2": "iqiyi",
    "3": "le",
    "4": "tencent",
    "5": "meipai",
    "6": "toutiao",
    "7": "miaopai",
    "8": "bili",
    "9": "souhu",
    "10": "kuaibao"
}
// 将错误信息存储到数据库，达到一定频率，发报警邮件
    // ---->定时监控redis内容，查看错误是否有重复
exports.judgeRes = (core,platform,url,bid,err,res,callback,urlDesc) => {
    if(err){
        this.errStoraging(core,platform,url,bid,err,"responseErr",urlDesc)
        return
    }
    if(!res){
        storaging.errStoraging(core,platform,url,bid,err,"responseErr",urlDesc)
        return
    }
    if(res && res.statusCode != 200){
        this.errStoraging(core,platform,url,bid,res.errDesc,"responseErr",urlDesc)
        return
    }
}
exports.sendDb = (core,media) => {
    let MSDB = core.MSDB,
        logger = core.settings.logger,
        curPlatform
    for(let key in platformMap){
        if(key == media.platform){
            curPlatform = platformMap[key]
        }
    }
    MSDB.hset(`${curPlatform}:${media.aid}`,"play_num",media.play_num,(err,result)=>{
        if ( err ) {
            logger.error( '加入接口监控数据库出现错误：', err )
            return
        }
        logger.debug(`${curPlatform} ${media.aid} 的播放量加入数据库`)
    })
    MSDB.expire(`${curPlatform}:${media.aid}`,12*60*60) 
}
exports.succStorage = (core,platform,url,urlDesc) => {
    let logger = core.settings.logger,
        MSDB = core.MSDB,
        curSuccKey = `${platform}:${urlDesc}`,
        succTimes
    MSDB.hget(curSuccKey,"succTimes",(err,result) => {
        if(err){
            logger.error( '获取接口成功调取次数出现错误', err )
            return
        }
        if (!result) {
            succTimes = 1
        }  else {
            succTimes = Number(result) + 1
        }
        MSDB.hset(curSuccKey,"succTimes",succTimes,(err,result) => {
            if(err){
                logger.error( '设置接口成功调取次数出现错误', err )
                return
            }
        })
    })
}
exports.errStoraging = (core,platform,url,bid,errDesc,errType,urlDesc) => {
    let firstDate = new Date()
        firstTime = firstDate.getTime()
        options = {
            "platform": platform,
            "url": url,
            "urlDesc": urlDesc,
            "bid": bid,
            "errDesc": errDesc,
            "firstTime": firstTime,
            "times": 1,
            "lastTime": firstTime
        },
        logger = core.settings.logger,
        MSDB = core.MSDB,
        currentErr = JSON.stringify(options),
        curErrKey = `${platform}:${urlDesc}`
    logger.debug("有错误发生喽，正在分析与存储~~~~~~")
    function pushCurErr(MSDB,options){
        MSDB.hset(curErrKey,errType,JSON.stringify(options),(err,result) => {
            if ( err ) {
                logger.error( '错误信息加入数据库失败出现错误：', err )
                return
            }
            logger.debug(`错误信息已加入数据库`)
        })
        logger.debug("错误已存入redis")
    }
     MSDB.hget(curErrKey,errType,(err,result) => {
        logger.debug("result=",result)
        if(err||!result){
            pushCurErr(MSDB,options)
        }  else{
            let lastDate = new Date()
                lastTime = lastDate.getTime()
                curErrTimes = JSON.parse(result).times
                firstTime = JSON.parse(result).firstTime
                curErrTimes++
            let newOptions = {
                    "platform": options.platform,
                    "url": options.url,
                    "urlDesc": options.urlDesc,
                    "bid": options.bid,
                    "errDesc": options.errDesc,
                    "firstTime": firstTime,
                    "times": curErrTimes ? curErrTimes : 1,
                    "lastTime": lastTime
                }
            logger.debug("newOptions=",newOptions)
            pushCurErr(MSDB,newOptions)
        }
    })
}