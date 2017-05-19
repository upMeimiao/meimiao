/**
 * Created by qingyu on 16/12/2.
 */
const async = require( 'async' )
const request = require('../../lib/request.js')
const moment = require('moment')
const videoList = function (data){
    return data
}
let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('wangyiDealWith instantiation ...')
    }
    wangyi (task,callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err,result)=>{
                        callback(err,result)
                    })
                },
                media: (callback) => {
                    this.getList(task,(err,result)=>{
                        if(err){
                            return callback(err)
                        }
                        callback(err,result)
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                callback(null,result)
            }
        )
    }
    getUser (task,callback){
        let option = {
            url: api.wangyi.userInfo + task.id+".html"
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("wangyi",option.url,"user")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                this.storaging.errStoraging('wangyi',option.url,task.id,err.code || "error",errType,"user")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('wangyi',option.url,task.id,`网易获取user接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('wangyi',option.url,task.id,"网易获取user接口json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: result.topicSet.subnum
            }
            callback()
        })
    }
    getList ( task,callback ) {
        let sign=2 ,
            page=0,
            countNum=1
        async.whilst(
            () => {
                return countNum < sign
            },
            (cb) => {
                let option = {
                    url: api.wangyi.videoInfo + task.id+"/video/"+page+"-20.html"
                }
                request.get( logger, option, (err,result) => {
                    this.storaging.totalStorage ("wangyi",option.url,"list")
                    if(err){
                        let errType
                        if(err.code){
                            if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                                errType = "timeoutErr"
                            } else{
                                errType = "responseErr"
                            }
                        } else{
                            errType = "responseErr"
                        }
                        //logger.error(errType)
                        this.storaging.errStoraging("wangyi",option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if( result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('wangyi',option.url,task.id,"网易获取list接口状态码错误","statusErr","list")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('视频列表json解析失败')
                        this.storaging.errStoraging('wangyi',option.url,task.id,"网易获取list接口json数据解析失败","doWithResErr","list")
                        return cb()
                    }
                    if(!result || result.length == 0){
                        logger.error('数据解析异常失败')
                        this.storaging.errStoraging('wangyi',option.url,task.id,"网易获取list接口json数据解析异常失败","doWithResErr","list")
                        sign=0
                        countNum++
                        return cb()
                    }
                    task.total+=result.tab_list.length
                    //logger.debug(+"总共视频记录"+task.total)
                    if(result.tab_list.length <= 0){
                        sign=0
                    }
                    page+=20
                    this.deal(task,result.tab_list, () => {
                        sign++
                        countNum++
                        cb()
                    })
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, list, callback ) {
        let index = 0,
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getVideo(task,list[index],function (err) {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getVideo(task ,data ,callback ) {
        let media
        async.parallel(
            [
                (cb) => {
                    this.getPlay(task,data.videoID,(err,result) => {
                        cb(null,result)
                    })
                },
                (cb) => {
                    this.getVidInfo(task,data.videoID,(err,result) => {
                        cb(null,result)
                    })
                }
            ],
            (err,result) => {
                if(!result[0] || !result[1]){
                    return
                }
                media = {
                    author: task.name,
                    platform: task.platform,
                    bid: task.id,
                    aid: data.videoID,
                    title: data.title.substr(0,100).replace(/"/g,''),
                    desc: data.digest.substr(0,100).replace(/"/g,''),
                    comment_num: data.replyCount,
                    a_create_time: moment(data.ptime).format('X'),
                    v_img:data.imgsrc,
                    long_t:data.length,
                    class:data.TAGS,
                    support: result[0].supportcount,
                    step: result[0].opposecount,
                    play_num: result[0].hits,
                    v_url: result[1].vurl
                }
                if(!media.play_num){
                    return callback()
                }
                // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
                //     if(err){
                //         logger.debug("读取redis出错")
                //         return callback()
                //     }
                //     if(result > media.play_num){
                //         this.storaging.errStoraging('wangyi',`${option.url}`,task.id,`网易视频播放量减少`,"playNumErr","paly",media.aid,`${result}/${media.play_num}`)
                //     }
                //     this.storaging.sendDb(media/*,task.id,"paly"*/)
                // })
                this.storaging.playNumStorage(media,"paly")
                callback()
            }
        )

    }
    getVidInfo( task, vid, callback ){
        let option = {
            url: 'http://3g.163.com/touch/video/detail/jsonp/'+vid+'.html?callback=videoList'
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("wangyi",option.url,"video")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("wangyi",option.url,task.id,err.code || "error",errType,"video")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('wangyi',option.url,task.id,`网易获取video接口状态码错误${result.statusCode}`,"statusErr","video")
                return callback()
            }
            try {
                result = eval(result.body)
            } catch (e) {
                logger.error('视频详情json解析失败')
                this.storaging.errStoraging('wangyi',option.url,task.id,"网易获取video接口json解析失败","doWithResErr","video")
                return callback(null,'')
            }
            callback(null,result)
        })
    }
    getPlay( task, vid, callback ) {
        let option = {
            url: 'http://so.v.163.com/vote/'+vid+'.js'
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("wangyi",option.url,"paly")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("wangyi",option.url,task.id,err.code || "error",errType,"paly")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('wangyi',option.url,task.id,`网易获取paly接口状态码错误${result.statusCode}`,"statusErr","paly")
                return callback()
            }
            try {
                result = result.body.replace('var vote = ','').replace(';','')
                result = JSON.parse(result)
            } catch (e) {
                logger.error('视频播放json解析失败')
                this.storaging.errStoraging('wangyi',option.url,task.id,"网易获取paly接口json解析失败","doWithResErr","paly")
                return callback(null,'')
            }
            // logger.debug("wangyi media==============",media)
            callback(null,result.info)
        })
    }
}
module.exports = dealWith