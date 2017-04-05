/**
 * Created by ifable on 16/9/8.
 */
const moment = require('moment')
const async = require( 'async' )
const fetchUrl = require("fetch").fetchUrl
const request = require('../../lib/request.js')
const spiderUtils = require('../../lib/spiderUtils')
const jsonp = function(data){
    return data
}

let logger,api
class dealWith {
    constructor(spiderCore) {
       this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('tv56DealWith instantiation ...')
    }
    tv56( task, callback ) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err,result)=>{
                        callback(err,result)
                    })
                },
                media: (callback) => {
                    this.getTotal(task,(err,result)=>{
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
    getUser ( task, callback ) {
        let option = {
            url: api.tv56.userInfo + `?uids=${task.id}&_=${new Date().getTime()}`,
            ua: 1
        }
        request.get( logger, option, (err, result)=>{
            this.storaging.totalStorage ("tv56",option.url,"user")
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
                this.storaging.errStoraging('tv56',option.url,task.id,err.code || "error",errType,"user")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('tv56',option.url,task.id,`tv56获取user接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('tv56',option.url,task.id,"tv56获取user接口json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            //logger.debug(result)
            let userInfo = result.data,user
            if(userInfo.length === 0){
                this.storaging.errStoraging('tv56',option.url,task.id,"tv56获取user接口异常","resultErr","user")
                return callback(true)
            }
            user = {
                platform: task.p,
                bid: task.id,
                fans_num: userInfo[0].fansCount
            }
            callback()
        })
    }
    getTotal ( task, callback ) {
        let page = 1,
            option = {
                url: api.tv56.list + `${task.id}&_=${new Date().getTime()}`+'&pg='+page,
                ua: 1
            }
        //logger.debug(option.url)
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("tv56",option.url,"total")
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
                this.storaging.errStoraging('tv56',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('tv56',option.url,task.id,`tv56获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try {
                result = eval(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                this.storaging.errStoraging('tv56',option.url,task.id,"tv56获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            //logger.debug(result)
            let data = result.data,
                total = data.count
            task.total = total
            if(total % 20 != 0){
                page = Math.ceil(total / 20)
            }else{
                page = total / 20
            }
            //logger.debug(page)
            this.getVideos(task,page, () => {
                callback()
            })
        })
    }
    getVideos ( task, page, callback ) {
        let sign = 1,option = {}
        option.ua = 1
        async.whilst(
            () => {
                return sign <= Math.min(page,500)
            },
            (cb) => {
                option.url = api.tv56.list + `${task.id}&pg=${sign}&_=${new Date().getTime()}`
                request.get( logger, option, (err, result) => {
                    this.storaging.totalStorage ("tv56",option.url,"videos")
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
                        this.storaging.errStoraging('tv56',option.url,task.id,err.code || "error",errType,"videos")
                        return callback(err)
                    }
                    if(result.statusCode != 200){
                        this.storaging.errStoraging('tv56',option.url,task.id,`tv56获取videos接口状态码错误${result.statusCode}`,"statusErr","videos")
                        return callback(result.statusCode)
                    }
                    try {
                        result = eval(result.body)
                    } catch (e) {
                        this.storaging.errStoraging('tv56',option.url,task.id,"tv56获取videos接口json数据解析失败","doWithResErr","videos")
                        return callback(e)
                    }
                    let data = result.data,
                        videos = data.list
                    if(!videos){
                        return cb()
                    }
                    this.deal(task,videos, () => {
                        sign++
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
                let video = list[index]
                this.info( task, video, (err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    info ( task, video, callback ){
        async.parallel(
            [
                ( callback ) => {
                    this.getInfo( task, video.id, ( err, data ) =>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,data)
                    })
                },
                ( callback ) => {
                    this.getComment( task, video.id, ( err, num ) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,num)
                    })
                }
            ], (err,result) => {
                if(err){
                    return callback(err)
                }
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.id,
                    title: video.title.substr(0,100).replace(/"/g,''),
                    desc: result[0].video_desc.substr(0,100).replace(/"/g,''),
                    play_num: result[0].play_count,
                    long_t:video.videoLength,
                    v_url: 'http://www.56.com/u74/v_' + video.vid56Encode + '.html',
                    v_img: video.smallCover,
                    class: result[0].first_cate_name,
                    tag: video.tag,
                    comment_num: result[1],
                    a_create_time: video.uploadTime.toString().substr(0,10)
                }
                if(!media.play_num){
                    return
                }
                // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
                //     if(err){
                //         logger.debug("读取redis出错")
                //         return
                //     }
                //     if(result > media.play_num){
                //         this.storaging.errStoraging('tv56',"",`tv56播放量减少`,"playNumErr","info",media.aid,`${result}/${media.play_num}`)
                //     }
                //     this.storaging.sendDb(media/*,task.id,"info"*/)
                // })
                this.storaging.playNumStorage(media,"info")
                // logger.debug("tv56 media==============",media)
                //logger.debug(media)
                callback()
            }
        )
    }
    getInfo ( task, id, callback ){
        let options = {
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1"
            }
        }
        fetchUrl(api.tv56.video + `${id}&_=${new Date().getTime()}`, options, (error, meta, body) => {
            this.storaging.totalStorage ("tv56",options.url,"info")
            if(error){
                let errType
                if(error.code){
                    if(error.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                // logger.error(errType)
                this.storaging.errStoraging('tv56',options.url,task.id,error.code || "error",errType,"info")
                return callback(error)
            }
            if(!meta){
                this.storaging.errStoraging('tv56',options.url,task.id,"tv56 info接口无返回数据","responseErr","info")
                return callback()
            }
            if(meta.status != 200){
                logger.error(`getInfo请求状态有误: ${meta.status}`)
                this.storaging.errStoraging('tv56',options.url,task.id,"tv56获取info接口请求状态有误","statusErr","info")
                return callback(true)
            }
            try {
                body = JSON.parse(body)
            } catch (e) {
                logger.error('json数据解析失败')
                this.storaging.errStoraging('tv56',options.url,task.id,"tv56获取info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            //logger.debug(body)
            callback(null,body.data)
        })
    }
    getComment ( task, id, callback ){
        let option = {
            url: api.tv56.comment + `${id}&_=${new Date().getTime()}`,
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("tv56",option.url,"comment")
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
                this.storaging.errStoraging('tv56',option.url,task.id,err.code || "error",errType,"comment")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('tv56',option.url,task.id,`tv56获取comment接口状态码错误${result.statusCode}`,"statusErr","comment")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('tv56',option.url,task.id,"tv56获取comment接口json数据解析失败","doWithResErr","comment")
                return callback(e)
            }
            callback(null,result.cmt_sum)
        })
    }
}
module.exports = dealWith