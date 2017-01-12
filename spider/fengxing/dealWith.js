/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require( '../lib/request' )

let logger
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0
        this.getVideo(task,(err) => {
            if(err){
                return callback(err)
            }
            callback(null,task.total)
        })
    }
    getVideo( task, callback ){
        let option = {}
        if(task.id.toString().length < 6){
            option.url = 'http://www.fun.tv/channel/lists/'+task.id+'/'
            request.get( logger, option, (err, result) => {
                if (err) {
                    logger.error( '视频总量接口请求错误 : ', err )
                    return callback(err)
                }
                let $ = cheerio.load(result.body),
                vidObj = $('div.mod-wrap-in.mod-li-lay.chan-mgtp>div')
                this.getVideoList( task, vidObj, callback )
            })
        }else{
            option.url = 'http://pm.funshion.com/v5/media/episode?cl=iphone&id='+task.id+'&si=0&uc=202&ve=3.2.9.2'
            request.get( logger, option, (err, result) => {
                if (err) {
                    logger.error( '视频总量接口请求错误 : ', err )
                    return callback(err)
                }
                if(result.statusCode != 200){
                    logger.error('风行状态码错误',result.statusCode)
                    logger.info(result)
                    return callback(true)
                }
                try{
                    result = JSON.parse(result.body)
                }catch (e){
                    logger.error('视频总量数据解析失败')
                    logger.info(result)
                    return
                }
                task.total = result.total
                this.getVidList(task,callback)
            })
        }
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
                let h = vidObj.eq(index).find('a').attr('data-id')
                option.url = 'http://www.fun.tv/vplay/c-'+task.id+'.h-'+h+'/'
                request.get( logger, option, (err, result) => {
                    if (err) {
                        logger.error( '视频总量接口请求错误 : ', err )
                        return callback(err)
                    }
                    let $ = cheerio.load(result.body),
                        dataJson = $('script')[6].children[0].data.replace(/[\s\n\r]/g,''),
                        startIndex = dataJson.indexOf('{"dvideos":'),
                        endIndex = dataJson.indexOf(';window.shareInfo')
                        dataJson = dataJson.substring(startIndex,endIndex)
                    try{
                        dataJson = JSON.parse(dataJson)
                    }catch(e){
                        logger.debug(dataJson)
                        logger.debug('视频列表解析失败')
                        return callback(e)
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
            if (err) {
                logger.error( '列表接口请求错误 : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error('风行状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                return
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
                        title: result[0].name,
                        comment_num: result[0].comment_num,
                        class: result[0].channel,
                        long_t: video.raw_dura,
                        desc: result[0].brief.substring(0,100),
                        v_img: video.still,
                        play_num: video.play_index,
                        v_url: result[0].share,
                        a_create_time: result[0].release
                    }
                    //logger.debug(media)
                    this.sendCache(media)
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
                        title: video.name,
                        comment_num: result[0].comment_num,
                        class: result[0].class,
                        long_t: this.getVidTime(video.duration),
                        v_img: video.still,
                        play_num: video.total_vv,
                        v_url: 'http://www.fun.tv/vplay/g-'+task.id+'.v-'+video.id+'/',
                        a_create_time: result[0].time
                    }
                    //logger.debug(media)
                    this.sendCache(media) 
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
                        this.getComment(vid,(err,result) => {
                            cb(null,result)
                        })
                    }
                ],
                (err,data) => {
                    request.get( logger, option, (err, result) => {
                        if (err) {
                            logger.error( '单个视频接口请求错误 : ', err )
                            return callback(err)
                        }
                        
                        if(result.statusCode != 200){
                            logger.error('风行状态码错误',result.statusCode)
                            logger.info(result)
                            return callback(true)
                        }
                        try{
                            result = JSON.parse(result.body)
                        }catch(e){
                            logger.error('json数据解析失败')
                            logger.info(result)
                            return callback(e)
                        }
                        result.release = result.release.replace(/[年月]/g,'-').replace('日','')
                        let time = new Date(result.release+' 00:00:00')
                        result.release = moment(time).format('X')
                        result.comment_num = data
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
                    if (err) {
                        logger.error( '单个DOM接口请求错误 : ', err )
                        return callback(err)
                    }
                    let $ = cheerio.load(result.body),
                        vidClass = $('div.crumbsline a').eq(1).text(),
                        comment_num = $('a.commentbtn span.count').text(),
                        res = {
                            comment_num: comment_num,
                            class: vidClass,
                            time: data
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
            if (err) {
                logger.error( 'time接口请求错误 : ', err )
                return callback(err)
            }
            
            if(result.statusCode != 200){
                logger.error('风行状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            result.data.number = result.data.number+' 00:00:00'
            let time = moment(result.data.number,'YYYYMMDD HH:mm:ss').format('X')
            result.data.number = time
            callback(null,result.data.number)
        })
    }
    getComment( vid, callback ){
        let option = {
            url : 'http://api1.fun.tv/comment/display/video/'+vid+'?pg=1&isajax=1'
        }
        request.get( logger, option, (err, result) => {
            if (err) {
                logger.error( '评论接口请求错误 : ', err )
                return callback(err)
            }
            
            if(result.statusCode != 200){
                logger.error('风行状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            
            callback(null,result.data.total_num)
        })
    }
    sendCache (media){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`风行 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith