/**
 * Created by junhao on 16/6/22.
 */
const async = require( 'async' )
const request = require( '../../lib/request' )
let logger,api
class miaopaiDealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('miaopaiDealWith instantiation ...')
    }
    miaopai (task,callback) {
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
                        callback(err,result)
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                callback(err,result)
            }
        )
    }
    getUser (task,callback){
        let option = {
            url: api.miaopai.api + "1&per=20&suid=" + task.id
        }
        request.get(logger,option,(err,result) => {
            this.storaging.totalStorage ("miaopai",option.url,"user")
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
                this.storaging.errStoraging('miaopai',option.url,task.id,err.code || "error",errType,"user")
                return callback()
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('miaopai',option.url,task.id,`秒拍获取粉丝接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback()
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('miaopai',option.url,task.id,"秒拍获取粉丝json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            if(!result.header){
                this.storaging.errStoraging('miaopai',option.url,task.id,"秒拍获取粉丝接口返回数据错误","resultErr","user")
                return callback()
            }
            let userInfo = result.header,
                user = {
                    platform: 7,
                    bid: userInfo.suid,
                    fans_num: userInfo.eventCnt.fans
                }
            callback()
        })
    }
    getTotal ( task, callback ) {
        let option = {
            url: api.miaopai.api + "1&per=20&suid=" +task.id
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("miaopai",option.url,"total")
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
                this.storaging.errStoraging('miaopai',option.url,task.id,err.code || "error",errType,"total")
                if(task.id == 'mEpTsCBR3q2uyDUc'){
                    return callback()
                }
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('miaopai',option.url,task.id,`秒拍获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                if(task.id == 'mEpTsCBR3q2uyDUc'){
                    return callback()
                }
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e){
                this.storaging.errStoraging('miaopai',option.url,task.id,"秒拍获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            if(!result.total){
                this.storaging.errStoraging('miaopai',option.url,task.id,"秒拍获取total接口返回数据错误","resultErr","total")
                return callback(result)
            }
            let videos_count = result.total,page
            task.total = videos_count
            if(videos_count%20 == 0){
                page = videos_count/20
            }else{
                page = Math.floor(videos_count/20)+1
            }
            this.getVideos(task,page, () => {
                callback()
            })
            // this.storaging.succStorage("miaopai",option.url,"total")
        })
    }
    getVideos ( task, page, callback ) {
        let sign = 1,option
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option = {
                    url: api.miaopai.api + sign + "&per=20&suid=" + task.id
                }
                // logger.debug(option.url)
                request.get(logger, option, (err,result) => {
                    this.storaging.totalStorage ("miaopai",option.url,"videos")
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
                        this.storaging.errStoraging('miaopai',option.url,task.id,err.code || "error",errType,"videos")
                        return cb()
                    }
                    if( result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('miaopai',option.url,task.id,`秒拍获取videos接口状态码错误${result.statusCode}`,"statusErr","videos")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e){
                        this.storaging.errStoraging('miaopai',option.url,task.id,"秒拍获取videos接口json数据解析失败","doWithResErr","videos")
                        return cb()
                    }
                    if(!result.result){
                        this.storaging.errStoraging('miaopai',option.url,task.id,"秒拍获取videos接口返回数据错误","resultErr","videos")
                        return cb()
                    }
                    let videos = result.result
                    this.deal(task,videos, () => {
                        sign++
                        cb()
                    })
                    // this.storaging.succStorage("miaopai",option.url,"videos")
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, list, callback ) {
        let index = 0,
            length = list.length,
            video,data
        async.whilst(
            () => {
                return index < length
            },
            ( cb ) => {
                video = list[index]
                this.getInfo( task, video.channel.scid, (err, result) => {
                    data = {
                        author: task.name,
                        platform: 7,
                        bid: task.id,
                        aid:video.channel.scid,
                        title:video.channel.ext.ft ? video.channel.ext.ft.substr(0,100).replace(/"/g,'') : `btwk_caihongip`,
                        desc: video.channel.ext.t.substr(0,100).replace(/"/g,''),
                        play_num: video.channel.stat.vcnt,
                        comment_num: video.channel.stat.ccnt,
                        support: video.channel.stat.lcnt,
                        forward_num: video.channel.stat.scnt,
                        a_create_time: Math.ceil(video.channel.ext.finishTime / 1000)
                    }
                    if(!err && result){
                        data.v_img = result.v_img
                        data.long_t = result.long_t
                        data.class = result.class
                        data.tag = result.tag
                    }
                    
                    if(!data.play_num){
                        return
                    }
                    // logger.debug(data.title+'标题')
                    // logger.debug(data.desc+'描述')
                    // this.core.MSDB.hget(`apiMonitor:play_num`,`${data.author}_${data.aid}`,(err,result)=>{
                    //     if(err){
                    //         logger.debug("读取redis出错")
                    //         return
                    //     }
                    //     if(result > data.play_num){
                    //         this.storaging.errStoraging('miaopai',"",task.id,`秒拍播放量减少`,"playNumErr","videos",data.aid,`${result}/${data.play_num}`)
                    //     }
                    //     this.storaging.sendDb(data/*,task.id,"videos"*/)
                    // })
                    this.storaging.playNumStorage(data,"videos")
                    index++
                    cb()
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    getInfo( task, id, callback){
        let option = {
            url : "http://api.miaopai.com/m/v2_channel.json?fillType=259&scid="+id+"&vend=miaopai"
        }
        let dataJson = {}
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("miaopai",option.url,"info")
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
                this.storaging.errStoraging('miaopai',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('miaopai',option.url,task.id,`秒拍获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch ( e ){
                this.storaging.errStoraging('miaopai',option.url,task.id,`秒拍获取info接口json数据解析失败`,"doWithResErr","info")
                return callback(e)
            }
            if(!result.result){
                this.storaging.errStoraging('miaopai',option.url,task.id,`秒拍获取info接口返回数据错误`,"resultErr","info")
                return callback(result)
            }
            dataJson.long_t = result.result.ext.length
            dataJson.v_img  = result.result.pic.base+result.result.pic.m
            dataJson.class  = this._class(result.result.category_info)
            dataJson.tag    = this._tag(result.result.topicinfo)
            // this.storaging.succStorage("miaopai",option.url,"info")
            callback(null,dataJson)
        })
    }
    _tag ( raw ){
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
    _class ( raw ){
        let _classArr = []
        if(!raw){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            for( let i in raw){
                _classArr.push(raw[i].categoryName)
            }
            return _classArr.join(',')
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(typeof raw == 'object'){
            return raw.categoryName
        }
        return ''
    }
}
module.exports = miaopaiDealWith