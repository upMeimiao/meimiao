/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require('../../lib/request.js')

let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('fengxingDealWith instantiation ...')
    }
    fengxing ( task, callback ) {
        task.total = 0
        this.getVideo(task,(err,result) => {
            if(err){
                return callback(err)
            }
            callback(null,result)
        })
    }
    getVideo( task, callback ){
        let option = {}
        if(task.id.toString().length < 6){
            option.url = 'http://www.fun.tv/channel/lists/'+task.id+'/'
            request.get( logger, option, (err, result) => {
                this.storaging.totalStorage ("fengxing",option.url,"video")
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
                    this.storaging.errStoraging("fengxing",option.url,task.id,err.code || "error",errType,"video")
                    return this.getVideo(task,callback)
                }
                if(result.statusCode && result.statusCode != 200){
                    this.storaging.errStoraging('fengxing',option.url,task.id,"风行网video接口状态码错误","statusErr","video")
                    return this.getVideo(task,callback)
                }
                let $ = cheerio.load(result.body),
                vidObj = $('div.mod-wrap-in.mod-li-lay.chan-mgtp>div')
                if(!vidObj){
                    this.storaging.errStoraging("fengxing",option.url,task.id,"风行网从dom中获取video信息失败","domBasedErr","video")
                    return this.getVideo(task,callback)
                }
                async.parallel(
                    {
                        user: (cb) => {
                            this.getFans(task, (err,result) => {
                                cb(err,result)
                            })
                        },
                        media: (cb) => {
                            this.getVideoList( task, vidObj, (err,result) => {
                                cb(err,result)
                            })
                        }
                    },
                    (err, result) => {
                        callback(err,result)
                    }
                )
            })
        }else{
            option.url = 'http://pm.funshion.com/v5/media/episode?cl=iphone&id='+task.id+'&si=0&uc=202&ve=3.2.9.2'
            request.get( logger, option, (err, result) => {
                this.storaging.totalStorage ("fengxing",option.url,"video")
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
                    this.storaging.errStoraging("fengxing",option.url,task.id,err.code || "error",errType,"video")
                    return this.getVideo(task,callback)
                }
                if(result.statusCode && result.statusCode != 200){
                    logger.error('风行状态码错误',result.statusCode)
                    this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取video接口状态码错误","statusErr","video")
                    return this.getVideo(task,callback)
                }
                try{
                    result = JSON.parse(result.body)
                }catch (e){
                    logger.error('视频总量数据解析失败')
                    this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取video接口json数据解析失败","doWithResErr","video")
                    return this.getVideo(task,callback)
                }
                task.total = result.total
                this.getVidList(task,callback)
            })
        }
    }
    getFans( task, callback ){
        let name = encodeURIComponent(task.name),
            option = {
                url: 'http://www.fun.tv/search/?word=' + name + '&type=site'
            }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("fengxing",option.url,"fans")
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
                this.storaging.errStoraging("fengxing",option.url,task.id,err.code || "error",errType,"fans")
                return this.getFans( task, callback )
            }
            if(result.statusCode && result.statusCode != 200){
                logger.error('风行状态码错误',result.statusCode)
                this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取fans接口状态码错误","statusErr","fans")
                return this.getFans( task, callback )
            }
            let $ = cheerio.load(result.body),
                list = $('div.search-result>div.search-item'),
                user = {
                    bid: task.id,
                    platform: 34
                }
            for(let i = 0; i < list.length; i++){
                let bid = list.eq(i).attr('block').match(/g_\d*/).toString().replace('g_','')
                if(task.id == bid){
                    user.fans_num = list.eq(i).find('div.mod-li-i div.mod-sub-wrap span.sub-tip b').text()
                    logger.info(user)
                    //this.sendUser( user )
                    //this.sendStagingUser( user )
                    return callback()
                }
            }
        })
    }
    getVideoList( task, vidObj, callback ){
        let index  = 0,
            length = vidObj.length,
            option = {}
            task.type = '视频号'
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                // logger.debug("fengixng vidObj==============",vidObj)
                let h = vidObj.eq(index).find('a').attr('data-id')
                option.url = 'http://www.fun.tv/vplay/c-'+task.id+'.h-'+h+'/'
                request.get( logger, option, (err, result) => {
                    this.storaging.totalStorage ("fengxing",option.url,"list")
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
                        this.storaging.errStoraging("fengxing",option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        logger.error('风行状态码错误',result.statusCode)
                        this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取list接口状态码错误","statusErr","list")
                        return cb()
                    }
                    let $ = cheerio.load(result.body),
                        dataJson = $('script')[6].children[0].data.replace(/[\s\n\r]/g,''),
                        startIndex = dataJson.indexOf('{"dvideos":'),
                        endIndex = dataJson.indexOf(';window.shareInfo')
                        dataJson = dataJson.substring(startIndex,endIndex)
                    try{
                        dataJson = JSON.parse(dataJson)
                    }catch(e){
                        // logger.debug(dataJson)
                        this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取list接口json数据解析失败","doWithResErr","list")
                        return cb()
                    }
                    let length  = dataJson.dvideos[0].videos.length,
                        content = dataJson.dvideos[0].videos
                    task.h = h
                    task.total += length
                    //logger.debug(index)
                    this.deal(task,content,length,() => {
                        index++
                        cb()
                    })
                })
            },
            (err,result) => {
                logger.debug('视频数据请求完成')
                callback()
            }
        )
    }
    getVidList( task, callback ){
        task.type  = '原创'
        let option = {
                url: 'http://pm.funshion.com/v5/media/episode?cl=iphone&id='+task.id+'&si=0&uc=202&ve=3.2.9.2'
            }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("fengxing",option.url,"vidList")
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
                this.storaging.errStoraging("fengxing",option.url,task.id,err.code || "error",errType,"vidList")
                return this.getVidList(task,callback)
            }
            if(result.statusCode && result.statusCode != 200){
                logger.error('风行状态码错误',result.statusCode)
                this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取vidList接口状态码错误","statusErr","vidList")
                return this.getVidList(task,callback)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取vidList接口json数据解析失败","doWithResErr","vidList")
                return this.getVidList(task,callback)
            }
            let length  = result.episodes.length,
                content = result.episodes
            this.deal(task,content,length,() => {
                logger.debug('数据请求完成')
               callback()
            })
        })    
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
    getNumber(str){
        let strArr = str.split(","),
            newStr = "",i
        for(i = 0; i < strArr.length; i++){
            newStr += strArr[i]
        }
        return newStr
    }
    getAllInfo( task, video, callback ){
        if(task.type == '视频号'){
            async.series(
                [
                    (cb) => {
                        this.getVideoInfo( task, video.videoid, (err,result) => {
                            cb(err,result)
                        })
                    }
                ],
                (err ,result) => {
                    let media = {
                        author: task.name,
                        platform: task.p,
                        bid: task.id,
                        aid: video.videoid,
                        title: result[0].name ? result[0].name.replace(/"/g,'') : '',
                        comment_num: result[0].comment_num ? result[0].comment_num : '',
                        class: result[0].channel ? result[0].channel : '',
                        long_t: video.raw_dura,
                        desc: result[0].brief ? result[0].brief.substring(0,100).replace(/"/g,'') : '',
                        v_img: video.still,
                        play_num: video.play_index,
                        v_url: result[0].share ? result[0].share : '',
                        a_create_time: result[0].release ? result[0].release : ''
                    }
                    //logger.debug(media)
                    if(!media.play_num){
                        return
                    }
                    let playNum = media.play_num,
                        playNumStr = playNum.toString()
                    if(playNumStr.indexOf(",") >= 0){
                        media.play_num = Number(this.getNumber(playNumStr))
                    }
                    // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
                    //     if(err){
                    //         logger.debug("读取redis出错")
                    //         return
                    //     }
                    //     if(result > media.play_num){
                    //         this.storaging.errStoraging('fengxing',"",task.id,`风行网视频播放量减少`,"playNumErr","list",media.aid,`${result}/${media.play_num}`)
                    //     }
                    //     this.storaging.sendDb(media/*,task.id,"list"*/)
                    // }
                    this.storaging.playNumStorage(media,"list")
                    callback()
                }
            )            
        }else{
            async.series(
                [
                    (cb) => {
                        this.getVideoInfo( task, video.id, (err,result) => {
                            cb(err,result)
                        })
                    }
                ],
                (err,result) => {
                    let media = {
                        author: task.name,
                        platform: task.p,
                        bid: task.id,
                        aid: video.id,
                        title: video.name.replace(/"/g,''),
                        comment_num: result[0].comment_num,
                        class: result[0].class,
                        long_t: this.getVidTime(video.duration),
                        v_img: video.still,
                        play_num: video.total_vv,
                        v_url: 'http://www.fun.tv/vplay/g-'+task.id+'.v-'+video.id+'/',
                        a_create_time: result[0].time
                    }
                    
                    callback()
                }
            )
        }
        
    }
    getVidTime( time ){
        let timeArr = time.split(':'),
            long_t  = '';
        if(timeArr.length == 2){
            long_t = parseInt(timeArr[0]*60) + parseInt(timeArr[1])
        }else if(timeArr.length == 3){
            long_t = parseInt((timeArr[0]*60)*60) + parseInt(timeArr[1]*60) + parseInt(timeArr[2])
        }
        return long_t;
    }
    getVideoInfo( task, vid, callback ){
        let option = {}
        if(task.type == '视频号'){
            option.url= 'http://pv.funshion.com/v5/video/profile?cl=iphone&id='+vid+'&si=0&uc=202&ve=3.2.9.2'
            //logger.debug(option.url)
            async.waterfall(
                [
                    (cb) => {
                        this.getComment(task,vid,(err,result) => {
                            cb(null,result)
                        })
                    }
                ],
                (err,data) => {
                    request.get( logger, option, (err, result) => {
                        this.storaging.totalStorage ("fengxing",option.url,"info")
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
                            this.storaging.errStoraging("fengxing",option.url,task.id,err.code || "error",errType,"info")
                            return this.getVideoInfo(task,vid,callback)
                        }
                        if(result.statusCode && result.statusCode != 200){
                            logger.error('风行状态码错误',result.statusCode)
                            this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取info接口状态码错误","statusErr","info")
                            return this.getVideoInfo(task,vid,callback)
                        }
                        try{
                            result = JSON.parse(result.body)
                        }catch(e){
                            logger.error('json数据解析失败')
                            this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取info接口json数据解析失败","doWithResErr","info")
                            return this.getVideoInfo(task,vid,callback)
                        }
                        result.release = result.release.replace(/[年月]/g,'-').replace('日','')
                        let time = new Date(result.release+' 00:00:00')
                        result.release = moment(time).format('X')
                        result.comment_num = data ? data : ''
                        callback(null,result)
                    })
                }
            )
        }else{
            option.url= 'http://www.fun.tv/vplay/g-'+task.id+'.v-'+vid+'/'
            //logger.debug(option.url)
            async.waterfall(
                [
                    (cb) => {
                        this.getCreatTime( task.id, vid, (err,result) => {
                            cb(null,result)
                        })
                    }
                ],
                (err,data) => {
                    request.get( logger, option, (err, result) => {
                    this.storaging.totalStorage ("fengxing",option.url,"info")
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
                        this.storaging.errStoraging("fengxing",option.url,task.id,err.code || "error",errType,"info")
                        return this.getVideoInfo(task,vid,callback)
                    }
                    let $ = cheerio.load(result.body),
                        vidClass = $('div.crumbsline a').eq(1).text(),
                        comment_num = $('a.commentbtn span.count').text(),
                        res = {
                            comment_num: comment_num ? comment_num : '',
                            class: vidClass ? vidClass : '',
                            time: data ? data : ''
                        }
                    callback(null,res)
                })
                }
            )
        }
        
    }
    getCreatTime( id, vid, callback ){
        let option = {
            url : 'http://api1.fun.tv/ajax/new_playinfo/gallery/'+vid+'/?user=funshion&mid='+id
        }
        //logger.debug(option.url)
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("fengxing",option.url,"creatTime")
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
                this.storaging.errStoraging("fengxing",option.url,id,err.code || "error",errType,"creatTime")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                logger.error('风行状态码错误',result.statusCode)
                this.storaging.errStoraging('fengxing',option.url,id,"风行网获取creatTime接口状态码错误","statusErr","creatTime")
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('fengxing',option.url,id,"风行网获取creatTime接口json数据解析失败","doWithResErr","creatTime")
                return callback(e)
            }
            result.data.number = result.data.number+' 00:00:00'
            let time = moment(result.data.number,'YYYYMMDD HH:mm:ss').format('X')
            result.data.number = time
            callback(null,result.data.number)
        })
    }
    getComment( task, vid, callback ){
        let option = {
            url : 'http://api1.fun.tv/comment/display/video/'+vid+'?pg=1&isajax=1'
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("fengxing",option.url,"comment")
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
                this.storaging.errStoraging("fengxing",option.url,task.id,err.code || "error",errType,"comment")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                logger.error('风行状态码错误',result.statusCode)
                this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取comment接口状态码错误","statusErr","comment")
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('fengxing',option.url,task.id,"风行网获取comment接口json数据解析失败","doWithResErr","comment")
                return callback(e)
            }
            
            callback(null,result.data.total_num)
        })
    }
}
module.exports = dealWith