const moment = require('moment')
const async = require( 'async' )
const request = require( '../../lib/request' )
let logger,api
class billDealWith {
    constructor ( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('billDealWith instantiation ...')
    }
    bili ( task, callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err,result)=>{
                        callback(err,result)
                    })
                },
                media: (callback) => {
                    this.getTotal( task, (err,result) => {
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
    getUser ( task, callback) {
        let option = {
            url: api.bili.userInfo,
            referer: `http://space.bilibili.com/${task.id}/`,
            data: {
                mid: task.id
            }
        }
        request.post (logger,option,(err,result)=>{
            this.storaging.totalStorage ("bili",option.url,"user")
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
                this.storaging.errStoraging('bili',option.url,task.id,err.code || "error",errType,"user")
                return callback(err)
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('bili',option.url,task.id,`哔哩哔哩获取粉丝${result.statusCode}`,"statusErr","user")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取粉丝json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            if(!result.data){
                this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取粉丝返回数据错误","resultErr","user")
                return callback()
            }
            let userInfo = result.data,
                user = {
                    platform: 8,
                    bid: userInfo.mid,
                    fans_num: userInfo.fans
                }
            if(!user.fans_num&&user.fans_num!==0){
                this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取粉丝数失败","resultErr","user")
                return callback()
            }
            callback()
        })
    }
    getTotal ( task, callback) {
        let option = {
            url: api.bili.mediaList + task.id + "&pagesize=30"
        }
        request.get(logger, option, (err,result) => {
            this.storaging.totalStorage ("bili",option.url,"total")
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
                this.storaging.errStoraging('bili',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('bili',option.url,task.id,`哔哩哔哩获取total接口${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            if(!result.data){
                this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取total接口返回数据错误","resultErr","total")
                return callback()
            }
            if(!result.data.count||!result.data.pages){
                this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取total接口返回数据错误","resultErr","total")
                return callback()
            }
            task.total = result.data.count
            // this.storaging.succStorage("bili",option.url,"total")
            this.getVideos( task, result.data.pages, () => {
                callback()
            })
        })
    }
    getVideos ( task,pages,callback) {
        let option,sign = 1
        async.whilst(
            () => {
                return sign <= pages
            },
            (cb) => {
                option = {
                    url: api.bili.mediaList + task.id + "&page=" + sign + "&pagesize=30"
                }
                request.get(logger, option, (err,result) => {
                    this.storaging.totalStorage ("bili",option.url,"videos")
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
                        this.storaging.errStoraging('bili',option.url,task.id,err.code || "error",errType,"videos")
                        return cb()
                    }
                    if( result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('bili',option.url,task.id,`哔哩哔哩获取videos接口${result.statusCode}`,"statusErr","videos")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e){
                        this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取videos接口json数据解析失败","doWithResErr","videos")
                        return cb()
                    }
                    if(!result.data){
                        // logger.debug(result)
                        sign++
                        return cb()
                    }
                    if(!result.data.vlist || result.data.vlist == 'null'){
                        // logger.debug(result)
                        sign++
                        return cb()
                    }
                    // this.storaging.succStorage("bili",option.url,"videos")
                    this.deal(task,result.data.vlist,() => {
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
    deal ( task,list,callback) {
        let index = 0,
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getInfo(task,list[index], (err) => {
                    if(err){
                        index++
                        return cb()
                    }
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task,video,callback ) {
        let option = {
            url: api.bili.media + video.aid
        }
        request.get(logger, option, (err,back) => {
            this.storaging.totalStorage ("bili",option.url,"info")
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
                this.storaging.errStoraging('bili',option.url,task.id,err.code||"error",errType,"info")
                return callback(err)
            }
            if(back.statusCode != 200){
                this.storaging.errStoraging('bili',option.url,task.id,`哔哩哔哩获取info${back.statusCode}`,"responseErr","info")
                return callback(back.statusCode)
            }
            try {
                back = JSON.parse(back.body)
            } catch (e){
                this.storaging.errStoraging('bili',option.url,task.id,`哔哩哔哩获取info接口json数据解析失败`,"doWithResErr","info")
                return callback(e)
            }
            if(back.code != 0){
                this.storaging.errStoraging('bili',option.url,task.id,`哔哩哔哩获取info接口返回数据code错误${back.code}`,"resultErr","info")
                return callback(back.code)
            }
            let tagStr = ''
            if(back.data.tags && back.data.tags.length != 0){
                tagStr = back.data.tags.join(',')
            }
            // this.storaging.succStorage("bili",option.url,"info")
            let media = {
                author: task.name,
                platform: 8,
                bid: task.id,
                aid: back.data.aid,
                title: back.data.title.substr(0,100).replace(/"/g,''),
                desc: back.data.desc.substr(0,100).replace(/"/g,''),
                play_num: back.data.stat.view,
                save_num: back.data.stat.favorite > 0 ? back.data.stat.favorite : null,
                comment_num: back.data.stat.reply,
                forward_num: back.data.stat.share,
                a_create_time: back.data.pubdate,
                long_t:this.long_t(video.length),
                v_img:video.pic,
                class:back.data.tname,
                tag:tagStr
            }
            if(!media.save_num){
                delete media.save_num
            }
            
            if(!media.play_num){
                return callback()
            }
            // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
            //     if(err){
            //         logger.debug("读取redis出错")
            //         return
            //     }
            //     if(result > media.play_num){
            //         this.storaging.errStoraging('miaopai',`${api.miaopai.media}${media.aid}`,task.bid,`秒拍播放量减少`,"playNumErr","videos",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"videos"*/)
            // })
            this.storaging.playNumStorage(media,"videos")
            callback()
        })
    }
    long_t( time ){
        let timeArr = time.split(':'),
            long_t  = ''
        if(timeArr.length == 2){
            long_t = moment.duration( `00:${time}`).asSeconds()
        }else if(timeArr.length == 3){
            long_t = moment.duration(time).asSeconds()
        }
        return long_t
    }
}
module.exports = billDealWith