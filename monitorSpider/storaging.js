// 将错误信息存储到数据库，达到一定频率，发报警邮件
    // ---->定时监控redis内容，查看错误是否有重复
const Redis = require('ioredis')
const mSpiderClint = new Redis(`redis://:C19prsPjHs52CHoA0vm@127.0.0.1:6379/7`,{
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
	    mSpiderClint.expire(`apiMonitor:play_num`,6*60*60) 
	}
	totalStorage (platform,url,urlDesc){
		let nowDate = new Date(),
			hour = nowDate.getHours(),
	       	nowTime = nowDate.getTime(),
	       	curKey = `apiMonitor:all`,
			field = `${platform}_${urlDesc}`
	    mSpiderClint.hget(curKey,field,(err,result) => {
	    	let totalObj = {}
	        if(err){
	            logger.error( '获取接口成功调取次数出现错误', err )
	            return
	        }
	        if (!result) {
	        	//无记录，直接存入
	            totalObj.firstTime = nowTime
	            totalObj.lastTime = nowTime
	            totalObj.times = 1
	        }  else {
	        	//有记录，加判断
	        	result = JSON.parse(result)
	        	totalObj.firstTime = result.firstTime
	        	totalObj.lastTime = nowTime
	        	totalObj.times = result.times
		        switch(field){
		        	case "tencent_total" || "tencent_user":
		        		if(totalObj.times >= 5){
		        			mSpiderClint.publish("tencent_total/user",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
		        	case "kuaibao_user" || "kuaibao_videos":
		        		if(totalObj.times >= 3){
		        			mSpiderClint.publish("kuaibao_user/videos",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
		        	case "ku6_user" || "ku6_total":
		        		if(totalObj.times >= 3){
		        			mSpiderClint.publish("ku6_user/total",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
		        	case "wangyi_user":
		        		if(totalObj.times >= 3){
		        			mSpiderClint.publish("wangyi_user",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
		        	case "mgtv_list":
		        		if(totalObj.times >= 5){
		        			mSpiderClint.publish("mgtv_list",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
		        	case "v1_fans" || "v1_total":
		        		if(totalObj.times >= 5){
		        			mSpiderClint.publish("v1_fans/total",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
		        	case "huashu_vidList" || "huashu_videoList":
		        		if(totalObj.times >= 10){
		        			mSpiderClint.publish("huashu_vidList/videoList",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
		        	case "baiduvideo_total":
		        		if(totalObj.times >= 3){
		        			mSpiderClint.publish("baiduvideo_total",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
		        	case "baomihua_user":
		        		if(totalObj.times >= 5){
		        			mSpiderClint.publish("baomihua_user",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
		        	default:
		        		if(totalObj.times >= 20){
		        			mSpiderClint.publish("other_urls",`${platform}-${urlDesc}-enough`,(err,result) => {
		        				if(err){
		        					return
		        				}
		        				logger.debug(err,result)
		        			})
		        			return
		        		} else{
		            		totalObj.times = Number(result.times) + 1
		        		}
		        		break
	        	}
	        }
	        mSpiderClint.hset(curKey,field,JSON.stringify(totalObj),(err,result) => {
	            if(err){
	                logger.error( '设置接口成功调取次数出现错误', err )
	                return
	            }
	        })
	        mSpiderClint.expire(curKey,6*60*60)  
	    })
	}
	errStoraging (platform,url,bid,errDesc,errType,urlDesc,vid,prop){
	    let nowDate = new Date(),
			hour = nowDate.getHours(),
			hourStr,
			urlStr = url,
	        times,errObj
	    if(hour >= 10){
	    	hourStr = "" + hour
	    }else{
	    	hourStr = "0" + hour
	    }
		let	curKey = `apiMonitor:error`,
			i,
			field = `${platform}_${urlDesc}`
	    mSpiderClint.hget(curKey,field,(err,result) => {
	        if(err){
	            logger.error( '获取接口成功调取次数出现错误', err )
	            return
	        }
	        // 若没有当前key的错误记录
	        // errtype times =1 ...
	        // 若有当前key的错误记录，查看errtype，若有times++，没有times=1
	        
	        if (!result || result && !result.length) {
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
	        mSpiderClint.hset(curKey,field,errString,(err,result) => {
	            if(err){
	                logger.error( '设置接口成功调取次数出现错误', err )
	                return
	            }
	        })
	        mSpiderClint.expire(curKey,6*60*60) 
	    })
	}
}
module.exports = storage