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
	    	logger.error(err,err.code,err.Error)
	    	let errType
	    	if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
            logger.error(errType)
	        this.errStoraging(platform,url,bid,err.code || err,errType,urlDesc)
	        return
	    }
	    if(!res){
	        this.errStoraging(platform,url,bid,`返回数据为空`,"responseErr",urlDesc)
	        return
	    }
	    if(res && res.statusCode != 200){
	        this.errStoraging(platform,url,bid,res.errDesc,"responseErr",urlDesc)
	        return
	    }
    }
    sendDb (media){
	    let   platformArr = ["youku","iqiyi","le","tencent","meipai","toutiao","miaopai","bili","souhu","kuaibao"
                  ,"yidian","tudou","baomihua","ku6","btime"/*,"weishi","xiaoying","budejie","neihan","yy"
                  ,"tv56","acfun","weibo","ifeng","wangyi","uctt","mgtv","baijia","qzone","cctv"
                  ,"pptv","xinlan","v1","fengxing","huashu","baofeng","baiduvideo"*/],
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
	        // logger.debug(`${curPlatform} ${media.aid} 的播放量加入数据库`)
	    })
	    mSpiderClint.expire(`apiMonitor:${curPlatform}:play_num:${media.aid}`,12*60*60) 
	}
	totalStorage (platform,url,urlDesc){
		let nowDate = new Date(),
			hour = nowDate.getHours(),
			hourStr,
			urlStr = encodeURIComponent(url), 
	        times
	    if(hour >= 10){
	    	hourStr = "" + hour
	    }else{
	    	hourStr = "0" + hour
	    }
		let	curKey = `apiMonitor:${platform}:${urlDesc}:total:${hourStr}`
	    mSpiderClint.hget(curKey,urlStr,(err,result) => {
	        if(err){
	            logger.error( '获取接口成功调取次数出现错误', err )
	            return
	        }
	        if (!result) {
	            times = 1
	        }  else {
	            times = Number(result) + 1
	        }
	        mSpiderClint.hset(curKey,urlStr,times,(err,result) => {
	            if(err){
	                logger.error( '设置接口成功调取次数出现错误', err )
	                return
	            }
	        })
	        mSpiderClint.expire(curKey,12*60*60) 
	    })
	}
	errStoraging (platform,url,bid,errDesc,errType,urlDesc){
	    let nowDate = new Date(),
			hour = nowDate.getHours(),
			hourStr,
			urlStr = encodeURIComponent(url),
	        times,errObj
	    if(hour >= 10){
	    	hourStr = "" + hour
	    }else{
	    	hourStr = "0" + hour
	    }
		let	curKey = `apiMonitor:${platform}:${urlDesc}:error:${hourStr}`
	    mSpiderClint.hget(curKey,urlStr,(err,result) => {
	        if(err){
	            logger.error( '获取接口成功调取次数出现错误', err )
	            return
	        }
	        if (!result || !result.length) {
	        	errObj = {
					"bid": bid,
					"responseErr": {
						"times": 0,
						"desc": ""
					},
					"resultErr": {
						"times": 0,
						"desc": ""
					},
					"doWithResErr": {
						"times": 0,
						"desc": ""
					},
					"domBasedErr": {
						"times": 0,
						"desc": ""
					},
					"timeoutErr":{
						"times": 0,
						"desc": ""
					}
				},
	        	// logger.debug("result  errObj errType urlDesc platform",result,errObj,errType,urlDesc,platform)
	            errObj[errType]["times"] = 1
	            errObj[errType]["desc"] = errDesc
	        }  else {
	        	errObj = JSON.parse(result)
	            errObj[errType]["times"] += 1
	            errObj[errType]["desc"] = errDesc
	        }
	        let errString = JSON.stringify(errObj)
	        mSpiderClint.hset(curKey,urlStr,errString,(err,result) => {
	            if(err){
	                logger.error( '设置接口成功调取次数出现错误', err )
	                return
	            }
	            mSpiderClint.expire(curKey,12*60*60) 
	        })
	    })
	}
}
module.exports = storage