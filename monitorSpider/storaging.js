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
	    	// logger.error(err,err.code,err.Error)
	    	let errType,errDesc
	    	if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                errType = "timeoutErr"
                errDesc = err.code
            } else{
                errType = "responseErr"
                errDesc = "error"
            }
            // logger.error(errType)
	        this.errStoraging(platform,url,bid,errDesc,errType,urlDesc)
	        return
	    }
	    if(!res){
	        this.errStoraging(platform,url,bid,`返回数据为空`,"resultErr",urlDesc)
	        return
	    }
	    if(res && res.statusCode && res.statusCode != 200 || res && res.status && res.status != 200){
	        this.errStoraging(platform,url,bid,res.errDesc,"statusErr",urlDesc)
	        return
	    }
    }
    sendDb (media,taskId,urlDesc){
	    let curPlatform = media.author
	    // logger.debug("当前的group_num为",minute,group_num)${curPlatform}-${urlDesc}-${taskId}-${media.aid}
	    mSpiderClint.hset(`apiMonitor:play_num`,`${curPlatform}_${media.aid}`,media.play_num,(err,result)=>{
	        if ( err ) {
	            logger.error( '加入接口监控数据库出现错误：', err )
	            return
	        }
	        // logger.debug(`${curPlatform} ${media.aid} 的播放量加入数据库`)
	    })
	    mSpiderClint.expire(`apiMonitor:play_num`,12*60*60) 
	}
	totalStorage (platform,url,urlDesc){
		let nowDate = new Date(),
			hour = nowDate.getHours(),
			urlStr = url, 
	        times
		let	curKey = `apiMonitor:all`,
			field = `${platform}_${urlDesc}_${hour}`
	    mSpiderClint.hget(curKey,field,(err,result) => {
	        if(err){
	            logger.error( '获取接口成功调取次数出现错误', err )
	            return
	        }
	        if (!result) {
	            times = 1
	        }  else {
	            times = Number(result) + 1
	        }
	        mSpiderClint.hset(curKey,field,times,(err,result) => {
	            if(err){
	                logger.error( '设置接口成功调取次数出现错误', err )
	                return
	            }
	        })
	        mSpiderClint.expire(curKey,12*60*60)  
	    })
	}
	errStoraging (platform,url,bid,errDesc,errType,urlDesc,vid,prop){
	    let nowDate = new Date(),
			hour = nowDate.getHours(),
			hourStr,
			urlStr = url,
	        times,errObj = {}
	    if(hour >= 10){
	    	hourStr = "" + hour
	    }else{
	    	hourStr = "0" + hour
	    }
		let	curKey = `apiMonitor:error:${platform}:${urlDesc}:${hourStr}`,
			i
	    mSpiderClint.get(curKey,(err,result) => {
	        if(err){
	            logger.error( '获取接口成功调取次数出现错误', err )
	            return
	        }
	        // 若没有当前key的错误记录
	        // errtype times =1 ...
	        // 若有当前key的错误记录，查看errtype，若有times++，没有times=1
	        
	        if (!result || !result.length) {
	        	errObj = {
					"bid": bid,
					"responseErr": {
						"times": 0,
						"desc": "",
						"errUrls": []
					},
					"resultErr": {
						"times": 0,
						"desc": "",
						"errUrls": []
					},
					"doWithResErr": {
						"times": 0,
						"desc": "",
						"errUrls": []
					},
					"domBasedErr": {
						"times": 0,
						"desc": "",
						"errUrls": []
					},
					"timeoutErr":{
						"times": 0,
						"desc": "",
						"errUrls": []
					},
					"playNumErr":{
						"times": 0,
						"desc": "",
						"errUrls": [],
						"vids": [],
						"props": []
					},
					"statusErr":{
						"times": 0,
						"desc": "",
						"errUrls": []
					}
				}
	        	// logger.debug("result  errObj errType urlDesc platform",result,errObj,errType,urlDesc,platform)
	            errObj[errType]["times"] = 1
	        }  else {
	        	errObj = JSON.parse(result)
	            errObj[errType]["times"] += 1
	        }
	        errObj[errType]["desc"] = errDesc
	        if(errType == "playNumErr" && errObj[errType]["vids"].indexOf(vid) < 0){
	        	errObj[errType]["vids"].push(vid)
	        	errObj[errType]["props"].push(prop)
	        }
	        let errArr = errObj[errType]["errUrls"],
	        	length,
	        	bool
	        // logger.debug("errArr++++++++++++++++++++++++++++++++++",errArr,urlStr)

	        if(!errArr || !errArr.length){
	        	errArr.push(urlStr)
	        } else{
	        	if(errArr.indexOf(urlStr) < 0){
	        		errArr.push(urlStr)
	        	}
	        	// length = errArr.length
	        	// for(i = 0; i < length; i++){
	        	// 	if(errArr[i] == urlStr){
	        	// 		bool = true
	        	// 	}
	        	// }
	        	// if(!bool){
	        	// 	errArr.push(urlStr)
	        	// }
	        }
	        let errString = JSON.stringify(errObj)
	        mSpiderClint.set(curKey,errString,(err,result) => {
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