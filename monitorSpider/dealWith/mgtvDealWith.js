/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require('../../lib/request.js')
const cheerio = require('cheerio')

let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('mgtvDealWith instantiation ...')
    }
    mgtv ( task, callback ) {
        task.total = 0
        this.getVidList( task, ( err,result ) => {
            if(err){
                return callback( err )
            }
            callback( err,result )
        })
    }

    getVidList( task, callback ){
        let sign   = 0,
            page   = 1,
            month  = ''
        async.whilst(
            () => {
                return sign < page
            },
            (cb) => {
                let option = {
                    url : api.mgtv.listVideo + task.id + "&month="+ month + "&_=" + (new Date()).getTime()
                }
                request.get( logger, option, ( err, result ) => {
                    this.storaging.totalStorage ("mgtv",option.url,"list")
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
                        this.storaging.errStoraging('mgtv',option.url,task.id,err.code || "error",errType,"list")
                        return callback(err)
                    }
                    if(result.statusCode != 200){
                        this.storaging.errStoraging('mgtv',option.url,task.id,`芒果TV获取list接口状态码错误${result.statusCode}`,"statusErr","list")
                        return callback(result.statusCode)
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        this.storaging.errStoraging('mgtv',option.url,task.id,"芒果TV获取list接口json数据解析失败","doWithResErr","list")
                        sign++
                        page++
                        return cb()
                    }
                    let length = result.data.list.length
                    task.total += length
                    if( sign >= result.data.tab_m.length ){
                        logger.debug('已经没有数据')
                        page = 0
                        sign++
                        return cb()
                    }
                    month = result.data.tab_m[sign].m
                    this.deal(task,result.data.list,length,() => {
                        sign++
                        page++
                        cb()
                    })

                })
            },
            (err,result) => {
                callback()
            }
        )

    }
    deal( task, user, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getAllInfo( task, user[index], () => {
                    index++
                    cb()
                })
            },
            (err,data) => {
                callback()
            }
        )
    }
    getAllInfo( task, video, callback ){
        async.parallel([
            (cb) => {
                this.getVideoInfo(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getPlayNum(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getClass(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getDesc(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getLike(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getComNum(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            }
        ],(err,result) => {
            if(err){
                return callback(err)
            }
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.video_id,
                title: video.t1.replace(/"/g,''),
                long_t: result[0].info.duration,
                v_img: video.img,
                v_url: "http://www.mgtv.com"+video.url,
                play_num: result[1].all,
                class: result[2].fstlvlName,
                support: result[4].data.like,
                step: result[4].data.unlike,
                desc: result[3] ? result[3].substring(0,100).replace(/"/g,'') : '',
                comment_num: result[5].total_number
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
            //         this.storaging.errStoraging('mgtv',"",task.id,`芒果TV视频播放量减少`,"playNumErr","paly",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"paly"*/)
            // })
            this.storaging.playNumStorage(media,"paly")
            callback()
        })
    }
    getComNum( task, video, callback ){
        let option  = {
            url:'http://comment.mgtv.com/video_comment/list/?subject_id='+ video.video_id +'&page=1&_='+ new Date().getTime()
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("mgtv",option.url,"commentNum")
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
                this.storaging.errStoraging('mgtv',option.url,task.id,err.code || "error",errType,"commentNum")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('mgtv',option.url,task.id,`芒果TV获取commentNum接口状态码错误${result.statusCode}`,"statusErr","commentNum")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('mgtv',option.url,task.id,"芒果TV获取commentNum接口json数据解析失败","doWithResErr","commentNum")
                return callback(e,null)
            }
            if(!result.total_number){
                result.total_number = ''
            }
            callback(null,result)
        })
    }
    getLike( task, video, callback ){
        let option  = {
            url:'http://vc.mgtv.com/v2/dynamicinfo?vid=' + video.video_id
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("mgtv",option.url,"like")
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
                this.storaging.errStoraging('mgtv',option.url,task.id,err.code || "error",errType,"like")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('mgtv',option.url,task.id,`芒果TV获取like接口状态码错误${result.statusCode}`,"statusErr","like")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('mgtv',option.url,task.id,"芒果TV获取like接口json数据解析失败","doWithResErr","like")
                return callback(e,null)
            }
            if(!result.data){
                result.data = {
                    like: '',
                    unlike: ''
                }
            }
            callback(null,result)
        })
    }
    getDesc( task, video, callback ){
        let option  = {
                url:'http://www.mgtv.com/b/'+ task.id +'/'+ video.video_id +'.html'
            },
            desc = ''
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("mgtv",option.url,"desc")
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
                this.storaging.errStoraging('mgtv',option.url,task.id,err.code || "error",errType,"desc")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('mgtv',option.url,task.id,`芒果TV获取desc接口状态码错误${result.statusCode}`,"statusErr","desc")
                return callback(result.statusCode)
            }
            let $ = cheerio.load(result.body)
            desc = $('span.details').text()
            if(!desc){
                this.storaging.errStoraging('mgtv',option.url,task.id,"芒果TV获取desc接口从返回的dom中获取数据失败","domBasedErr","desc")
                return callback(err,result)
            }
            callback(null,desc)
        })
    }
    getClass( task, video, callback ){
        let option = {
            url: 'http://mobile.api.hunantv.com/v7/video/info?device=iPhone&videoId=' + video.video_id
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("mgtv",option.url,"class")
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
                this.storaging.errStoraging('mgtv',option.url,task.id,err.code || "error",errType,"class")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('mgtv',option.url,task.id,`芒果TV获取class接口状态码错误${result.statusCode}`,"statusErr","class")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('mgtv',option.url,task.id,"芒果TV获取class接口json数据解析失败","doWithResErr","class")
                return callback(e,null)
            }
            if(!result.data.fstlvlName){
                result.data = {
                    fstlvlName: ''
                }
            }
            callback(null,result.data)
        })
    }
    getPlayNum( task, video, callback ){
        let option = {
            //用户的信息后边参数是cid,播放量是vid
            url: api.mgtv.userInfo + "vid=" + video.video_id
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("mgtv",option.url,"play")
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
                this.storaging.errStoraging('mgtv',option.url,task.id,err.code || "error",errType,"play")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('mgtv',option.url,task.id,`芒果TV获取play接口状态码错误${result.statusCode}`,"statusErr","play")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('数据解析失败')
                this.storaging.errStoraging('mgtv',option.url,task.id,"芒果TV获取play接口json数据解析失败","doWithResErr","play")
                return callback(e,null)
            }
            if(!result.data.all){
                result.data.all = ''
            }
            // logger.debug("mgtv media==============",media)
            callback(null,result.data)
        })
    }
    getVideoInfo( task, video, callback ){
        let option = {
            url: api.mgtv.videoInfo + video.video_id
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("mgtv",option.url,"info")
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
                this.storaging.errStoraging('mgtv',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('mgtv',option.url,task.id,`芒果TV获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('mgtv',option.url,task.id,"芒果TV获取info接口json数据解析失败","doWithResErr","info")
                return callback(e,null)
            }
            if(!result.info){
                result.info = {
                    duration: ''
                }
            }else if(!result.info.duration){
                result.info = {
                    duration: ''
                }
            }
            callback(null,result.data)
        })
    }
}
module.exports = dealWith