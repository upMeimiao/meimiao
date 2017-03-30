// 将错误信息存储到数据库，达到一定频率，发报警邮件
    // ---->定时监控redis内容，查看错误是否有重复
const Redis = require('ioredis')
const async = require('async')
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
	    mSpiderClint.expire(`apiMonitor:play_num`,24*60*60) 
	}
	playNumStorage(media,urlDesc){
		let platform = media.author,
			vid = media.aid,
			playNum = Number(media.play_num),
			key = "apiMonitor:playNum",
			field = `${platform}_${vid}`
		//存之前取对应播放量，分情况操作
		mSpiderClint.hget(key,field,(err,result) => {
			// logger.debug("获取到的播放量结果为",key,field,result)
			if(err){
				logger.debug("获取播放量连接redis数据库出错")
				return
			}
			//无返回结果，即没有记录，直接存入本次记录
			if(!result){
				mSpiderClint.hset(key,field,playNum,(err,result) => {
					if(err){
						logger.debug("设置播放量连接redis数据库出错")
						return
					}
					// logger.debug(playNum)
				})
			}else{
				//有结果，将本次playNum与result用-拼接,split成数组,做判断，分情况存储
				let arr
				result = result + "-" + playNum
				arr = result.split("-")
				//记录小于五次，直接将本次输入存入数组，再存入redis
				if(arr.length < 5){
					arr.push(playNum)
					mSpiderClint.hset(key,field,arr.join("-"),(err,result) => {
						if(err){
							logger.debug("设置播放量连接redis数据库出错")
							return
						}
						// logger.debug(arr)
					})
				} else{
					//记录大于等于五次，分析是否错误几率过半
					let len = arr.length,
						i = 0,
						wrongTimes = 0
					async.whilst(
						()=>{
							return i < len
						},
						(cb)=>{
							if(arr[i] < arr[0] || arr[i]/arr[0] > 10){
								wrongTimes ++
							}
							i++
							cb()
						},
						(err,result)=>{
							if(wrongTimes >= 3){
								// logger.debug(`${platform}_${vid}播放量错误，近五次记录为${arr}`)
								this.errStoraging(platform,"",media.bid,`${platform}平台${vid}接口播放量错误`,"playNumErr",urlDesc,vid,result)
							}
							let array = []
							if(arr[4] < arr[0]){
								array.push(arr[0])
							} else{
								array.push(arr[4])
							}
							mSpiderClint.hset(key,field,array.join("-"),(err,result) => {
								if(err){
									logger.debug("设置播放量连接redis数据库出错")
									return
								}
								// logger.debug(array)
							})
						}
					)
				}
			}
		})
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
	        	let arr1 = ["kuaibao_user","kuaibao_videos","ku6_user","ku6_total"
		        		,"wangyi_user","mgtv_list","baiduvideo_total"],
		        	arr2 = ["tencent_total","tencent_user","wangyi_list","v1_fans","v1_total"
		        		,"v1_fans","huashu_vidList","baiduvideo_list","baofeng_aid"],
		        	arr3 = ["le_total","meipai_user","meipai_total","bili_user","bili_total"
		        		,"tudou_user","tudou_fans","tudou_total","ku6_list","56tv_user"
		        		,"56tv_total","weibo_user","weibo_total","ifeng_total","uctt_list"
		        		,"baijia_fan","qzone_fan","pptv_list","xinlan_list","fengxing_video"
		        		,"fengxing_fans","baofeng_theAlbum","baofeng_list"],
		        	arr4 = ["iqiyi_user","iqiyi_total","iqiyi_list","tencent_list","miaopai_user","miaopai_total"
		        		,"souhu_user","souhu_total","kuaibao_info","kuaibao_commentNum","kuaibao_Expr"
		        		,"kuaibao_play","kuaibao_field","tudou_list","btime_user","weishi_user","uctt_info"
		        		,"uctt_commentNum","uctt_Desc"],
		        	arr5 = ["youku_user","youku_total","toutiao_user","miaopai_videos","bili_videos"
		        		,"baomihua_list","xiaoying_total","yy_total","56tv_videos","acfun_user","acfun_total"
		        		,"weibo_list","wangyi_video","wangyi_play","qzone_list","v1_list","baiduvideo_info"],
		        	arr6 = ["meipai_videos","toutiao_list","btime_list","xiaoying_list","ifeng_list","mgtv_commentNum"
		        		,"mgtv_like","mgtv_desc","mgtv_class","mgtv_play","mgtv_info","cctv_total","cctv_list"
		        		,"cctv_fans","liVideo_list"],
		        	arr7 = ["youku_info","souhu_list","baijia_info"],
		        	arr8 = ["le_Expr","le_info","le_Desc","budejie_user","tencent_vidTag","tencent_view"
		        		,"yidian_user","yidian_interestId","weishi_list","qzone_info"
		        		,"qzone_comment","v1_support","v1_comment","v1_info","fengxing_list"
		        		,"fengxing_info","fengxing_createTime","fengxing_comment","huashu_info"
		        		,"huashu_comment","huashu_play","baofeng_Desc","baofeng_support","baofeng_comment"],
		        	arr9 = ["youku_videos","iqiyi_info","iqiyi_Expr","iqiyi_play","iqiyi_comment","toutiao_listInfo"
		        		,"miaopai_info","tudou_videoTime","tudou_Expr","baomihua_Expr","baomihua_playNum","baomihua_ExprPC"
		        		,"btime_comment","yy_dlist","56tv_info","56tv_comment","weibo_info","baijia_vidList","pptv_total"
		        		,"pptv_info","xinlan_support","xinlan_comment","xinlan_info","liVideo_info","meipai_info","bili_info","souhu_info","souhu_commentNum","souhu_digg"
		        		,"xiaoying_info","budejie_list","acfun_list","ifeng_video","cctv_info"]
		        if(arr1.indexOf(field) > 0){
		        	if(totalObj.times >= 3){
		        		mSpiderClint.publish("enough",`${platform}-${urlDesc}`)
		        	} else{
		            	totalObj.times = Number(result.times) + 1
		        	}
		        } else if(arr2.indexOf(field) > 0){
		        	if(totalObj.times >= 5){
		        		mSpiderClint.publish("enough",`${platform}-${urlDesc}`)
		        	} else{
		            	totalObj.times = Number(result.times) + 1
		        	}
		        }else if(arr3.indexOf(field) > 0){
		        	if(totalObj.times >= 10){
		        		mSpiderClint.publish("enough",`${platform}-${urlDesc}`)
		        	} else{
		            	totalObj.times = Number(result.times) + 1
		        	}
		        }else if(arr4.indexOf(field) > 0){
		        	if(totalObj.times >= 20){
		        		mSpiderClint.publish("enough",`${platform}-${urlDesc}`)
		        	} else{
		            	totalObj.times = Number(result.times) + 1
		        	}
		        }else if(arr5.indexOf(field) > 0){
		        	if(totalObj.times >= 50){
		        		mSpiderClint.publish("enough",`${platform}-${urlDesc}`)
		        	} else{
		            	totalObj.times = Number(result.times) + 1
		        	}
		        }else if(arr6.indexOf(field) > 0){
		        	if(totalObj.times >= 100){
		        		mSpiderClint.publish("enough",`${platform}-${urlDesc}`)
		        	} else{
		            	totalObj.times = Number(result.times) + 1
		        	}
		        }else if(arr7.indexOf(field) > 0){
		        	if(totalObj.times >= 250){
		        		mSpiderClint.publish("enough",`${platform}-${urlDesc}`)
		        	} else{
		            	totalObj.times = Number(result.times) + 1
		        	}
		        }else if(arr8.indexOf(field) > 0){
		        	if(totalObj.times >= 500){
		        		mSpiderClint.publish("enough",`${platform}-${urlDesc}`)
		        	} else{
		            	totalObj.times = Number(result.times) + 1
		        	}
		        }else if(arr9.indexOf(field) > 0){
		        	if(totalObj.times >= 1000){
		        		mSpiderClint.publish("enough",`${platform}-${urlDesc}`)
		        	} else{
		            	totalObj.times = Number(result.times) + 1
		        	}
		        }
	        }
	        mSpiderClint.hset(curKey,field,JSON.stringify(totalObj),(err,result) => {
	            if(err){
	                logger.error( '设置接口成功调取次数出现错误', err )
	                return
	            }
	        })
	        mSpiderClint.expire(curKey,24*60*60)  
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
	        mSpiderClint.expire(curKey,24*60*60) 
	    })
	}
}
module.exports = storage