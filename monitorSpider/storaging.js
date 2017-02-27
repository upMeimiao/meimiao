// 将错误信息存储到数据库，达到一定频率，发报警邮件
    // ---->定时监控redis内容，查看错误是否有重复
const Redis = require('ioredis')
const mSpiderClint = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/7`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})
let logger
class storage{
    constructor (core) {
        this.core = core
        logger = this.core.settings.logger
    }
    judgeRes(platform,url,bid,err,res,urlDesc){
	    if(err){
	        this.errStoraging(platform,url,bid,err,"responseErr",urlDesc)
	        return
	    }
	    if(!res){
	        this.errStoraging(platform,url,bid,err,"responseErr",urlDesc)
	        return
	    }
	    if(res && res.statusCode != 200){
	        this.errStoraging(platform,url,bid,res.errDesc,"responseErr",urlDesc)
	        return
	    }
    }
    sendDb (media){
	    let platformArr = ["youku","iqiyi","le","tencent","meipai","toutiao","miaopai","bili","souhu","kuaibao"],
	        curPlatform,i
	    for(i = 0; i < platformArr.length; i++){
	        if(i + 1 == media.platform){
	            curPlatform = platformArr[i]
	        }
	    }
	    mSpiderClint.hset(`apiMonitor:${curPlatform}:play_num:${media.aid}`,"play_num",media.play_num,(err,result)=>{
	        if ( err ) {
	            logger.error( '加入接口监控数据库出现错误：', err )
	            return
	        }
	        logger.debug(`${curPlatform} ${media.aid} 的播放量加入数据库`)
	    })
	    mSpiderClint.expire(`apiMonitor:${curPlatform}:${media.aid}`,6*60*60) 
	}
	succStorage (platform,url,urlDesc){
	    let curSuccKey = `apiMonitor:${platform}:${urlDesc}`,
	        succTimes
	    mSpiderClint.hget(curSuccKey,"succTimes",(err,result) => {
	        if(err){
	            logger.error( '获取接口成功调取次数出现错误', err )
	            return
	        }
	        if (!result) {
	            succTimes = 1
	        }  else {
	            succTimes = Number(result) + 1
	        }
	        mSpiderClint.hset(curSuccKey,"succTimes",succTimes,(err,result) => {
	            if(err){
	                logger.error( '设置接口成功调取次数出现错误', err )
	                return
	            }
	        })
	    })
	}
	errStoraging (platform,url,bid,errDesc,errType,urlDesc){
	    let firstDate = new Date(),
	        firstTime = firstDate.getTime(),
	        options = {
	            "platform": platform,
	            "url": url,
	            "urlDesc": urlDesc,
	            "bid": bid,
	            "errDesc": errDesc,
	            "firstTime": firstTime,
	            "times": 1,
	            "lastTime": firstTime
	        }
	    let currentErr = JSON.stringify(options),
	        curErrKey = `apiMonitor:${platform}:${urlDesc}`
	    logger.debug("有错误发生喽，正在分析与存储~~~~~~")
	    function pushCurErr(options){
	        mSpiderClint.hset(curErrKey,errType,JSON.stringify(options),(err,result) => {
	            if ( err ) {
	                logger.error( '错误信息加入数据库失败出现错误：', err )
	                return
	            }
	            logger.debug(`错误信息已加入数据库`)
	        })
	        logger.debug("错误已存入redis")
	    }
	     mSpiderClint.hget(curErrKey,errType,(err,result) => {
	        logger.debug("result=",result)
	        if(err||!result){
	            pushCurErr(options)
	        }  else{
	            let lastDate = new Date(),
	                lastTime = lastDate.getTime(),
	                curErrTimes = JSON.parse(result).times,
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
	            pushCurErr(newOptions)
	        }
	    })
	}
}
module.exports = storage