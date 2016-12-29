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
                        title: video.title,
                        comment_num: result[0].comment_num,
                        class: result[0].class,
                        long_t: video.raw_dura,
                        v_img: video.still,
                        play_num: video.play_index,
                        v_url: 'http://www.fun.tv/vplay/g-'+task.id+'.v-'+video.videoid+'/'
                    }
                    //logger.debug(media.comment_num)
                    this.sendCache( media, () =>{
                        callback()
                    }) 
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
                        v_url: 'http://www.fun.tv/vplay/g-'+task.id+'.v-'+video.id+'/'
                    }
                    this.sendCache( media, () =>{
                        callback()
                    }) 
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
            option.url= 'http://www.fun.tv/vplay/c-'+task.id+'.h-'+task.h+'.v-'+vid+'/'            
        }else{
            option.url= 'http://www.fun.tv/vplay/g-'+task.id+'.v-'+vid+'/'
        }
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
                    class: vidClass
                }
            callback(null,res)
        })
    }
    sendCache (media,callback){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`风行 ${media.aid} 加入缓存队列`)
            callback()
        } )
    }
}
module.exports = dealWith