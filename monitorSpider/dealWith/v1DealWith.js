const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require('../../lib/request.js')
const jsonp = function(data){
    return data
}
let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('v1DealWith instantiation ...')
    }
    v1 ( task, callback ) {
        task.total = 0
        async.parallel(
            {
                user : (callback) => {
                    this.getFans(task,(err,result)=>{
                        callback(err,result)
                    })
                },
                video : (callback) => {
                    this.getVidTotal(task,(err,result)=>{
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
                callback(null,result)
            }
        )
    }
    
    getFans ( task, callback){
        let option = {},
            id = null
        if(task.id == task.encodeId){
            id = task.id
        }else{
            id = task.encodeId
        }
        option = {
            url: 'http://user.v1.cn/his/getAllCountByUserId/'+id+'.json',
            referer: 'http://user.v1.cn/his/video/'+id+'.jhtml'
        }
        request.get( logger, option, (err, result)=>{
            this.storaging.totalStorage ("v1",option.url,"fans")
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
                this.storaging.errStoraging('v1',option.url,task.id,err.code || "error",errType,"fans")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('v1',option.url,task.id,`第一视频获取fans接口状态码错误${result.statusCode}`,"statusErr","fans")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`v1 json数据解析失败`)
                this.storaging.errStoraging('v1',option.url,task.id,"第一视频获取fans接口json数据解析失败","doWithResErr","fans")
                return callback(e)
            }
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: result.obj.fansCount
            }
            task.total = result.obj.videoCount
            callback()
        })
    }
    getVidTotal( task, callback ){
        let option = {
            url: api.v1.videoList + task.id + "&p=1"
        },
        sign = 0
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("v1",option.url,"total")
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
                this.storaging.errStoraging('v1',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('v1',option.url,task.id,`第一视频获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('v1',option.url,task.id,"第一视频获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            let page   = result.body.page_num
            this.getVidList(task,page,sign,(err) => {
                callback()
            })
        })
        //logger.debug('进入成功')
    }
    
    getVidList( task,  page, sign, callback ){
        async.whilst(
            () => {
                return sign < page
            },
            (cb) => {
                let option = {
                    url : api.v1.videoList + task.id + "&p=" + sign
                }
                request.get( logger, option, ( err, result ) => {
                    this.storaging.totalStorage ("v1",option.url,"list")
                    if (err) {
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
                        this.storaging.errStoraging("v1",option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if(!result.body){
                        this.storaging.errStoraging('v1',option.url,task.id,"第一视频获取list接口无返回数据","resultErr","list")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('v1',option.url,task.id,"第一视频获取list接口状态码错误","statusErr","list")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('v1',option.url,task.id,"第一视频获取list接口json数据解析失败","doWithResErr","list")
                        return cb()
                    }
                    let length  = result.body.data.length,
                        content = result.body.data
                    this.deal(task,content,length,() => {
                        sign++
                        cb()
                    })
                })
            },
            (err,result) => {
                logger.debug('当前用户数据请求完成')
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
        let num = 0
        async.parallel(
            [
                (cb) => {
                    this.getVidInfo( task, video.vid, num, (err,result) => {
                        cb(err,result)
                    })
                },
                (cb) => {
                    this.getVideoInfo( task, video.vid, num, (err,result) => {
                        cb(err,result)
                    })
                },
                (cb) => {
                    this.getSupport( task, video.vid, (err, result) => {
                        cb(err,result)
                    })
                }
            ],
            (err,result) => {
                if(result[0] == 'next'|| !result[0] || !result[1]|| !result[2] ){
                    return callback()
                }
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.vid,
                    title: video.title.replace(/"/g,''),
                    comment_num: result[0].comments,
                    class: result[0].videoCategory ? result[0].videoCategory.name : '',
                    tag: result[1].tag,
                    desc: result[1].desc.substring(0,100).replace(/"/g,''),
                    support: result[2] ? result[2].msg : null,
                    forward_num: result[0].forward,
                    v_img: video.pic,
                    play_num: result[0].playNum,
                    v_url: result[0].wabSiteUrl,
                    a_create_time: moment(video.create_time).format('X')
                }
                if(!media.support){
                    delete media.support
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
                //         this.storaging.errStoraging('v1',"",task.id,`第一视频视频播放量减少`,"playNumErr","vidInfo",media.aid,`${result}/${media.play_num}`)
                //     }
                //     this.storaging.sendDb(media/*,task.id,"vidInfo"*/)
                // })
                this.storaging.playNumStorage(media,"vidInfo")
                callback()
            }
        )
    }
    getSupport( task, vid, callback ){
        let option = {
            url: 'http://user.v1.cn/openapi/getVideoPraise.json?videoId='+vid+'&callback=jsonp'
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("v1",option.url,"support")
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
                this.storaging.errStoraging('v1',option.url,task.id,err.code || "error",errType,"support")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('v1',option.url,task.id,`第一视频获取support接口状态码错误${result.statusCode}`,"statusErr","support")
                return callback(result.statusCode)
            }
            try{
                result = eval(result.body)
            }catch(e){
                logger.debug('点赞量解析失败')
                this.storaging.errStoraging('v1',option.url,task.id,"第一视频获取support接口json数据解析失败","doWithResErr","support")
                return callback(null, null)
            }
            callback(null,result)
        })
    }
    getVideoInfo( task, vid, num, callback ){
        let option = {
            url: 'http://www.v1.cn/video/v_'+vid+'.jhtml'
        }
        //logger.debug(option.url)
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("v1",option.url,"videoInfo")
            if (err) {
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
                this.storaging.errStoraging("v1",option.url,task.id,err.code || "error",errType,"videoInfo")
                if(num <= 1){
                    return this.getVideoInfo( task, vid, num++, callback )
                }
                return callback(null,{desc:'',tag:'',support:0})
            }
            let $       = cheerio.load(result.body),
                tag     = this.getTag($('li.summaryList_item ul.tagList li')),
                desc    = $('p.summaryList_long').text(),
                res   = {
                    desc: desc,
                    tag: tag,
                }
            callback(null,res)
        })
    }
    getTag( desc ){
        let str = ''
        for(let i = 0; i < desc.length; i++){
            if(desc.eq(i).text().replace(/\s/g,'') == ''){
                str += ''
            }else{
                str += desc.eq(i).text()+' '
            }
        }
        return str
    }
    getVidInfo( task, vid, num, callback ){
        let option = {
            url: 'http://static.app.m.v1.cn/www/mod/mob/ctl/videoDetails/act/get/vid/'+ vid +'/pcode/010210000/version/4.5.4.mindex.html'
        }
        //logger.debug(option.url)
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("v1",option.url,"vidInfo")
            if (err) {
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
                this.storaging.errStoraging("v1",option.url,task.id,err.code || "error",errType,"vidInfo")
                if(num <= 1){
                    return this.getVidInfo( task, vid, num++, callback )
                }
                return callback(null,'next')
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('v1',option.url,task.id,"第一视频获取vidInfo接口状态码错误","statusErr","vidInfo")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('单个视频json数据解析失败')
                this.storaging.errStoraging('v1',option.url,task.id,"第一视频获取info接口json数据解析失败","doWithResErr","vidInfo")
                return callback(e)
            }
            // logger.debug("v1 media==============",media)
            callback(null,result.body.obj.videoDetail)
        })
    }
}
module.exports = dealWith