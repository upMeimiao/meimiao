
const emailServerLz = require('./emailServerLz')
const platformMap = {
    "1":"youku",
    "2":"iqiyi"
}
// 将错误信息存储到数据库，达到一定频率，发报警邮件
    // ---->定时监控redis内容，查看错误是否有重复
exports.judgeRes = (core,platform,port,bid,err,res,callback,urlDesc) => {
        if(err){
            this.errStoraging(core,platform,port,bid,err,"responseErr",urlDesc)
            return callback(err)
        }
        if(res && res.statusCode != 200){
            this.errStoraging(core,platform,port,res.errDesc,"responseErr",urlDesc)
            return callback()
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
        MSDB.expire(`${curPlatform}:${media.aid}`,5*60*60) 
    }
/*
exports.errStorage = (core,platform,port,bid,errDesc,errType,urlDesc) => {
        let occurTime = new Date(),
            options = {
                platform: platform,
                port: port,
                bid: bid,
                errDesc: errDesc,
                occurTime: occurTime
            },
            logger = core.settings.logger,
            errDb = core.errDb,
            currentErr = JSON.stringify(options)
        function pushCurErr(errDb,options,occurTime){
            logger.debug("错误发生时间，occurTime=",occurTime)
            errDb.rpush("err", JSON.stringify(options),( err, result ) => {
                if ( err ) {
                    logger.error( '错误信息加入数据库失败出现错误：', err )
                    return
                }
                logger.debug(`错误信息已加入数据库`)
            })
            errDb.expire("err",24*60*60) ;
            logger.debug("错误已存入redis")
        }
        //如果是响应的error错误，直接存储错误并发报错邮件，返回
        if(errType == "responseErr"){
            pushCurErr(errDb,options,occurTime)
            let subject = "接口监控报警",
                content = `平台：${options.platform}<br/>接口：${options.port}<br/>用户ID：${options.bid}错误描述：${options.errDesc}<br/>`;
            emailServerLz.sendAlarm(subject, options)
            return
        }
        errDb.llen("err",(err,lenResult)=>{
            if(err || !lenResult){
                logger.debug("数据库为空，将存入第一条错误",currentErr)
                pushCurErr(errDb,options,occurTime)
                return
            }
            let nErrLen = lenResult,
                errTimes = 0
            if(err){
                logger.error('获取错误信息列表出错')
                return
            }
            errDb.lrange('err',0,-1,(err,listResult)=>{
                if(err || !listResult){
                    logger.error('获取错误信息列表出错')
                    return
                }
                for(let i = nErrLen - 1; i >= 0; i--){
                    let curErr = JSON.parse(currentErr),
                        iErr = listResult[i]
                        iError = JSON.parse(iErr)
                    if(curErr.platform == iError.platform
                        && curErr.port == iError.port
                        && curErr.bid == iError.bid
                        && curErr.errDesc == iError.errDesc){
                        errTimes++
                        logger.debug("errTimes++之后，errTimes=",errTimes,"i",i)
                        //当相同错误一小时内发生10次，报警邮件
                        let curErrDate = new Date(curErr.occurTime),
                            curErrTime = curErrDate.getTime(),
                            iErrDate = new Date(iError.occurTime),
                            firstErrTime = iErrDate.getTime()
                        logger.debug("for循环中，errTimes=",errTimes,"curErrTime=",curErrTime , "firstErrTime=",firstErrTime)
                        if(errTimes >= 2 
                            &&(curErrTime - firstErrTime <= 30*60*1000)){
                            logger.debug("errTimes="+errTimes+"curErrTime - firstErrTime="+(curErrTime - firstErrTime))
                            let subject = "接口监控报警",
                                content = `平台：${options.platform}<br/>接口：${options.port}<br/>用户ID：${options.bid}错误描述：${options.errDesc}<br/>时间频率：${iErrDate}到${curErrDate}已发生${errTimes}次`;
                            emailServerLz.sendAlarm(subject, options)
                            logger.error("邮件信息subject="+subject+"content="+content)
                            
                        }
                    }
                }
            })
            logger.debug("数据库不为空，存入当前错误",currentErr)
            pushCurErr(errDb,options,occurTime)
        })

            
    }
*/
exports.errStoraging = (core,platform,port,bid,errDesc,errType,urlDesc) => {
    let options = {
                platform: platform,
                port: port,
                bid: bid,
                errDesc: errDesc,
                times: 1
            },
            logger = core.settings.logger,
            errDb = core.errDb,
            currentErr = JSON.stringify(options),
            curErrKey = `${platform}:${urlDesc}:${errType}`
        logger.debug("有错误发生喽，正在分析与存储~~~~~~")
        // errDb存数据方法
        function pushCurErr(errDb,options){
            errDb.set(curErrKey,JSON.stringify(options),(err,result) => {
                if ( err ) {
                    logger.error( '错误信息加入数据库失败出现错误：', err )
                    return
                }
                logger.debug(`错误信息已加入数据库`)
            })
            errDb.expire("err",24*60*60) ;
            logger.debug("错误已存入redis")

        }
        //// 如果是响应的error错误，直接存储错误并发报错邮件，返回
        if(errType == "responseErr"){
            // error类型，直接报错
            errDb.get(curErrKey,(err,result) => {
                if(err||!result){
                    pushCurErr(errDb,options)
                }  else{
                    let curErrTimes = options.times
                        curErrTimes++
                    let newOptions = {
                        platform: options.platform,
                        port: options.port,
                        bid: options.bid,
                        errDesc: options.errDesc,
                        times: curErrTimes
                    }
                    pushCurErr(errDb,newOptions)
                    let subject = "接口监控报警",
                        content = `平台：${options.platform}<br/>接口：${options.port}<br/>用户ID：${options.bid}错误描述：${options.errDesc}<br/>错误次数：${curErrTimes}`;
                    logger.debug("错误内容：",content)
                    emailServerLz.sendAlarm(subject, options)
                }
            })
            return
        }
        // 取keys，与当前key作比较，若无相同，直接记录，若有相同，其times+1
        logger.debug("开始获取已存储的所有key")

        errDb.get(curErrKey,(err,result) => {
            if(err||!result){
                pushCurErr(errDb,options)
            }  else{
                let curErrTimes = options.times
                    curErrTimes++
                 if(options.times >= 4){
                    let subject = "接口监控报警",
                        content = `平台：${options.platform}<br/>接口：${options.port}<br/>用户ID：${options.bid}错误描述：${options.errDesc}<br/>错误次数：${options.times}`;
                        emailServerLz.sendAlarm(subject, options)
                        logger.error("邮件信息subject="+subject+"content="+content)
                }
                let nweOptions = {
                    platform: options.platform,
                    port: options.port,
                    bid: options.bid,
                    errDesc: options.errDesc,
                    times: curErrTimes
                }
                pushCurErr(errDb,nweOptions)
            }

        })

        // errDb.keys(pattern,(err,result) => {
        //     if(err){
        //         logger.debug("获取errDb的所有key失败")
        //     }
        //     let arrErrKeys = result
        //     // 取keys，与当前key作比较
        //     for(let key in arrErrKeys){
        //         // 若有相同，其times+1
        //         logger.debug("此错误之前已存储了，times++")
        //         if(curErrKey = key){
        //             let curErrTimes = options.times
        //             if(options.times >= 4){
        //                 let subject = "接口监控报警",
        //                         content = `平台：${options.platform}<br/>接口：${options.port}<br/>用户ID：${options.bid}错误描述：${options.errDesc}<br/>错误次数：${options.times}`;
        //                     emailServerLz.sendAlarm(subject, options)
        //                     logger.error("邮件信息subject="+subject+"content="+content)
        //             }
        //             errDb.set(key, JSON.stringify({
        //                 platform: options.platform,
        //                 port: options.port,
        //                 bid: options.bid,
        //                 errDesc: options.errDesc,
        //                 times: curErrTimes + 1
        //             }),(err,result) => {
        //                 if(err){
        //                     logger.debug("当前错误存入errDb失败")
        //                 }
        //             })
        //             logger.debug("nweOptions=",JSON.stringify({
        //                 platform: options.platform,
        //                 port: options.port,
        //                 bid: options.bid,
        //                 errDesc: options.errDesc,
        //                 times: curErrTimes + 1
        //             }))
        //         } else{
        //             // 若无相同，直接记录
        //             // 
        //             pushCurErr(errDb,options)
        //             logger.debug("此错误第一次发生，存入redis")
        //         }
        //     }
        // })
}