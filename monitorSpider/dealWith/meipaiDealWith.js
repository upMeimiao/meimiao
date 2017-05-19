/**
 * Created by ifable on 16/6/22.
 */
const async = require( 'async' )
const request = require( '../../lib/request' )
let logger,api
const classification = ['搞笑','明星名人','女神','舞蹈','音乐','美食','美妆','男神','宝宝','宠物','直播','热门']
class meipaiDealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('DealWith instantiation ...')
    }
    meipai (task,callback) {
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
            url: api.meipai.userInfo + task.id
        }
        request.get(logger,option,(err,result) => {
            this.storaging.totalStorage ("meipai",option.url,"user")
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
                this.storaging.errStoraging('meipai',option.url,task.id,err.code || "error",errType,"user")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('meipai',option.url,task.id,`美拍获取粉丝接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback(true)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取粉丝接口json数据解析失败","doWithResErr","user")
                return callback()
            }
            let user = {
                platform: 5,
                bid: result.id,
                fans_num: result.followers_count
            }
            callback()
        })
    }
    getTotal ( task,callback ) {
        let option = {
            url: api.meipai.userInfo + task.id
        }
        request.get(logger,option, (err,result) => {
            this.storaging.totalStorage ("meipai",option.url,"total")
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
                this.storaging.errStoraging('meipai',option.url,task.id,err.code||"error",errType,"total")
                return callback(err)
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('meipai',option.url,task.id,`美拍获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            let videos_count = result.videos_count,page
            task.total = videos_count
            if(videos_count%20 == 0){
                page = videos_count/20
            }else{
                page = Math.floor(videos_count/20)+1
            }
            this.getVideos(task,page, () => {
                callback()
            })
            // this.storaging.succStorage("meipai",option.url,"total")
        })
    }
    getVideos ( task,page,callback ) {
        let maxId = '',sign = 1,option
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option = {
                    url: api.meipai.mediaList + task.id + "&max_id=" + maxId
                }
                request.get(logger,option,(err,result) => {
                    this.storaging.totalStorage ("meipai",option.url,"videos")
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
                        this.storaging.errStoraging('meipai',option.url,task.id,err.code || "error",errType,"videos")
                        sign++
                        return cb()
                    }
                    if( result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('meipai',option.url,task.id,`美拍获取videos接口状态码错误${result.statusCode}`,"statusErr","videos")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取videos接口json数据解析失败","doWithResErr","videos")
                        sign++
                        return cb()
                    }
                    maxId = result[result.length-1].id
                    this.deal(task,result, () => {
                        sign++
                        cb()
                    })
                    // this.storaging.succStorage("meipai",option.url,"videos")
                })
            },
            function (err,result) {
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
                this.getInfo(task,list[index].id,function (err) {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, id, callback ) {
        let option = {
            url: api.meipai.media + id
        }
        request.get(logger, option, (err,result) => {
            this.storaging.totalStorage ("meipai",option.url,"info")
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
                this.storaging.errStoraging('meipai',option.url,task.id,err.code||"error",errType,"info")
                return callback(err)
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('meipai',option.url,task.id,`美拍获取info结口状态码错误${result.statusCode}`,"statusErr","info")
                return callback()
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            if(result.lives){
                return callback(result)
            }
            if(!result.caption
                ||!result.plays_count&&result.plays_count!==0
                ||!result.comments_count&&result.comments_count!==0
                ||!result.likes_count&&result.likes_count!==0
                ||!result.reposts_count&&result.reposts_count!==0
                ||!result.created_at
                ||!result.cover_pic){
                this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取info接口返回数据错误","resultErr","info")
                return callback(result)
            }
            let title,_tags = [],__tags = [],tags = '',tagArr
            if(result.caption && result.caption != ''){
                title = result.caption.substr(0,100)
                tagArr = result.caption.match(/#[^0-9a-zA-Z\x00-\xff]+#/ig)
                for( let i in tagArr){
                    _tags.push(tagArr[i].replace(/#/g,''))
                }
                for( let i in _tags){
                    if(classification.includes(_tags[i])){
                        __tags.push(_tags[i])
                    }
                }
                if(__tags.length != 0){
                    tags = __tags.join(',')
                }
            }else{
                title = 'btwk_caihongip'
            }
            let media = {
                author: task.name,
                platform: 5,
                bid: task.id,
                aid: result.id,
                title: title.replace(/"/g,''),
                desc: title.replace(/"/g,''),
                play_num: result.plays_count,
                comment_num: result.comments_count,
                support: result.likes_count,
                forward_num: result.reposts_count,
                a_create_time: result.created_at,
                long_t:result.time,
                v_img:result.cover_pic,
                tag: _tags.join(','),
                class: tags
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
            //         this.storaging.errStoraging('meipai',`${api.meipai.media}${media.aid}`,task.id,`美拍播放量减少`,"playNumErr","videos",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"videos"*/)
            // })
            this.storaging.playNumStorage(media,"videos")
            callback()
        })
    }
}
module.exports = meipaiDealWith