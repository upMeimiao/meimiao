/**
 * Created by junhao on 16/6/22.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( 'request' )
const jsonp = function (data) {
    return data
}
let logger,api

class youkuDealWith {
    constructor(core){
        this.core = core
        this.settings = core.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('youkuDealWith...')
    }
    youku (task,callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.youkuGetUser(task,(err,result)=>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,result)
                    })
                },
                media: (callback) => {
                    this.youkuGetTotal(task,(err,result)=>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,result)
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                callback(null, result)
            }
        )
    }
    youkuGetUser ( task, callback) {
        let options = {
            method: 'GET',
            url: 'https://mapi-channel.youku.com/feed.stream/show/get_channel_owner_page.json?content=info&caller=1&uid=' + task.encodeId
        }
        request(options,(err,res,body)=>{
            this.storaging.totalStorage ("youku",options.url,"user")
            if(err){
                //logger.error(err,err.code,err.Error)
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
                this.storaging.errStoraging("youku",options.url,task.id,err.code || "error",errType,"user")
                return callback(err.message)
            }
            if(res && res.statusCode != 200){
                this.storaging.errStoraging("youku",options.url,task.id,"优酷获取用户信息接口状态码错误","statusErr","user")
                return callback(res.statusCode)
            }
            try{
                body = JSON.parse(body)
            }catch(e){
                this.storaging.errStoraging("youku",options.url,task.id,"优酷获取用户信息接口json数据解析失败","doWithResErr","user")
                return callback(e.message)
            }
            if(body.code !== 1){
                return callback(body.desc)
            }
            if(!body.data){
                this.storaging.errStoraging('youku',options.url,task.id,body.desc,"resultErr","user")
                return callback(true)
            }
            let userInfo = body.data.channelOwnerInfo,
                user = {
                    platform: 1,
                    bid: task.id,
                    fans_num: userInfo.followerNum
                }
            callback()
        })
    }
    youkuGetTotal( task, callback ) {
        let page,
            options = {
                method: 'GET',
                url: api.youku.list,
                qs: { caller: '1', pg: '1', pl: '20', uid: task.encodeId },
                headers: {
                    'user-agent': 'Youku;6.1.0;iOS;10.2;iPhone8,2'
                },
                timeout: 5000
            }
        request(options, (error, response, body) => {
            this.storaging.totalStorage ("youku",options.url,"total")
            if(error){
                //logger.error(err,err.code,err.Error)
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
                //logger.error(errType)
                this.storaging.errStoraging("youku",options.url,task.id,error.code || "error",errType,"user")
                return callback(error.message)
            }
            if(response.statusCode != 200){
                this.storaging.errStoraging("youku",options.url,task.id,"优酷获取用户信息接口状态码错误","statusErr","user")
                return callback(response.statusCode)
            }
            try {
                body = JSON.parse(body)
            } catch (e) {
                logger.error('优酷获取全部视频接口json数据解析失败')
                this.storaging.errStoraging("youku",options.url,task.id,"优酷获取全部视频接口json数据解析失败","doWithResErr","total")
                // logger.debug('total error:',body)
                return callback(e)
            }
            if(body.code !== 1){
                return callback(body.desc)
            }
            let data = body.data
            if(!data){
                this.storaging.errStoraging('youku',options.url,task.id,body.desc,"resultErr","total")
                return callback(true)
            }
            let total = data.total
            task.total = total
            if(total % 50 != 0){
                page = Math.ceil(total / 50)
            }else{
                page = total / 50
            }
            // this.storaging.succStorage("youku",options.url,"total")
            this.youkuGetVideos(task,page, (err,result) => {
                callback()
            })
            //根据已存redis内容判断body内容是否正确
            
        })
    }
    youkuGetVideos ( task, page, callback ) {
        let sign = 1,options
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                options = {
                    method: 'GET',
                    url: api.youku.list,
                    qs: { caller: '1', pg: sign, pl: '50', uid: task.encodeId },
                    headers: {
                        'user-agent': 'Youku;6.1.0;iOS;10.2;iPhone8,2'
                    },
                    timeout: 5000
                }
                //logger.debug("++++++++++++++++++",options)
                request(options, (error, response, body) => {
                    this.storaging.totalStorage ("youku",options.url,"videos")
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
                        this.storaging.errStoraging('youku',options.url,task.id,error.code || error,errType,"videos")
                        return cb()
                    }
                    if(response.statusCode && response.statusCode != 200){
                        this.storaging.errStoraging('youku',options.url,task.id,"优酷获取单页视频列表接口状态码错误","statusErr","videos")
                        return cb()
                    }
                    try{
                        body = JSON.parse(body)
                    }catch (e){
                        this.storaging.errStoraging('youku',options.url,task.id,"优酷获取单页视频列表接口json数据解析失败","doWithResErr","videos")
                        // logger.debug('list error:',body)
                        return cb()
                    }
                    
                    let data = body.data
                    if(!data){
                        sign++
                        return cb()
                    }
                    //根据已存redis内容判断body内容是否正确
                    let videos = data.videos
                    // this.storaging.succStorage("youku",options.url,"videos")
                    this.youkuInfo(task,videos, () => {
                        sign++
                        cb()
                    })
                })
            },
            (err,result) => {
                callback(err,result)
            }
        )
    }
    youkuInfo ( task, list, callback ) {
        const idList = []
        for( let index in list){
            idList.push(list[index].videoid)
        }
        const ids = idList.join(',')
        const options = {
            method: 'GET',
            url: 'https://openapi.youku.com/v2/videos/show_batch.json',
            qs: {
                client_id:api.youku.app_key,
                video_ids:ids
            },
            timeout: 5000
        }
        request( options, ( error, response, body ) => {
            this.storaging.totalStorage ("youku",options.url,"info")
            if(error){
                //logger.error(err,err.code,err.Error)
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
                //logger.error(errType)
                this.storaging.errStoraging("youku",options.url,task.id,error.code || "error",errType,"user")
                return callback(error.message)
            }
            if(response.statusCode != 200){
                this.storaging.errStoraging("youku",options.url,task.id,"优酷获取用户信息接口状态码错误","statusErr","user")
                return callback(response.statusCode)
            }
            try{
                body = JSON.parse(body)
            } catch (e) {
                logger.error('优酷获取视频详情接口json数据解析失败')
                this.storaging.errStoraging('youku',options.url,task.id,"优酷获取视频详情接口json数据解析失败","doWithResErr","info")
                // logger.debug('info error:',body)
                return callback(e)
            }
            if(body && body.total == 0){
                return callback()
            }
            if(!body.videos || body.videos && !body.videos.length){
                this.storaging.errStoraging('youku',options.url,task.id,"优酷获取视频详情接口返回数据错误","resultErr","info")
                return callback()
            }
            this.youkuDeal( task, body.videos, list, (err,result) => {
                callback(err,result)
            })
        })
    }
    //将接口返回的数据进行处理，存入数据库
    youkuDeal ( task, videos, list, callback ){
        let index = 0,
            length = videos.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                const video = list[index]
                const result = videos[index]
                const media = {
                    author: task.name,
                    platform: 1,
                    bid: task.id,
                    aid: video.videoid,
                    title: video.title.substr(0,100),
                    desc: result.description.substr(0,100),
                    class: result.category,
                    tag: result.tags,
                    v_img: result.bigThumbnail,
                    long_t: Math.round(result.duration),
                    play_num: video.total_vv,
                    save_num: result.favorite_count,
                    comment_num: result.comment_count,
                    support: result.up_count,
                    step: result.down_count,
                    a_create_time: video.publishtime
                }
                if(!media.play_num){
                    return
                }
                // this.core.MSDB.hget(`apiMonitor:play_num`,`youku_${videos[index].videoid}`,(err,result)=>{
                //     if(err){
                //         logger.debug("读取redis出错")
                //         return
                //     }
                //     if(result > media.play_num){
                //         // logger.debug("~~~~~~~~~result="+result+"total_vv="+videos[index].total_vv)
                //         this.storaging.errStoraging("youku","",task.id,`优酷视频播放量减少`,"playNumErr","videos",media.aid,`${result}/media.play_num`)
                //     }
                //     this.storaging.sendDb(media/*,task.id,"videos"*/)
                // })
                this.storaging.playNumStorage(media,"videos")
                index++
                cb()
            },
            (err,result) => {
                callback(err,result)
            }
        )
    }
}
module.exports = youkuDealWith