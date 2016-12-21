/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../lib/request' )
const _Callback = function(data){
    return data
}
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
        this.getVidList( task, ( err ) => {
            if(err){
                return callback( err )
            }
            callback( null, task.total )
        })
    }
    
    getVidList( task, callback ){
        let sign   = 0,
            start  = 0,
            page   = 1,
            num    = 0
        async.whilst(
            () => {
                return sign < page
            },
            (cb) => {
                let option = {
                        url : this.settings.listVideo+task.id+"&start="+start
                    }
                logger.debug(option.url)
                request.get( logger, option, ( err, result ) => {
                    if (err) {
                        logger.error( '接口请求错误 : ', err )
                        if(num == 0){
                            setTimeout(() => {
                                num++
                                logger.debug('300毫秒之后重新请求一下当前列表')
                                return cb()
                            },300)
                        }else if(num == 1){
                            setTimeout(() => {
                                start += 10
                                logger.debug('300毫秒之后重新请求下一页列表')
                                return cb()
                            },300)
                        }else{
                            logger.info(result)
                            return callback(err)
                        }
                        
                    }
                    try{
                        result = eval(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return callback(e)
                    }
                    if(result.data.friend_data == undefined){
                        setTimeout(() => {
                            logger.debug('300毫秒之后重新请求一下')
                            return cb()
                        },300)
                    }
                    let length = result.data.friend_data.length-1
                    task.total += length
                    if( length <= 0 ){
                        logger.debug('已经没有数据')
                        page = 0
                        sign++
                        return cb()
                    }                   
                    this.deal(task,result.data,length,() => {
                        sign++
                        page++
                        start+=10
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
                this.getAllInfo( task, user.friend_data[index], () => {
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
        async.series([
            (cb) => {
                this.getVideoInfo(task,video,num,(err,result) => {
                    if(err){
                        cb(err)
                    }else{
                        cb(null,result)
                    }
                })
            }
        ],(err,result) => {
            if(err){
                logger.debug('当前视频解析不了，直接请求下一个视频')
                return callback()
            }
            if(result[0] == '抛掉当前的'){
                logger.debug('直接请求下一个视频')
                return callback()
            }
            if(result[0].singlefeed == undefined){
                return callback()
            }
            let media = {
                author: video.nickname,
                platform: task.p,
                bid: task.id,
                aid: result[0].singlefeed['7'].videoid,
                title: result[0].singlefeed['4'].summary,
                support: result[0].singlefeed['11'].num,
                long_t: result[0].singlefeed['7'].videotime/1000,
                v_img: result[0].singlefeed['7'].coverurl['0'].url,
                read_num: result[0].singlefeed['20'].view_count,
                v_url: result[0].singlefeed['7'].videourl,
                a_create_time: video.abstime
            }
            this.sendCache( media )
            callback()
        })
    }
    getVideoInfo( task, video, num, callback ){
        let option = {
            url: this.settings.videoInfo+task.id+"&appid="+video.appid+"&tid="+video.key+"&ugckey="+task.id+"_"+video.appid+"_"+video.key+"_"
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频请求失败 ' + err)
                if(num == 0){
                    setTimeout(() => {                    
                        this.getVideoInfo( task, video, num++, callback )
                    },300)
                    return logger.debug('300毫秒之后重新请求一下')
                }else if(num == 1){
                    return callback(null,'抛掉当前的')
                }
            }
            try{
                result = eval(result.body)
            } catch(e){
                logger.error('_Callback数据解析失败')
                logger.info(result)
                return callback(e)
            }
            callback(null,result.data.all_videolist_data[0])
        })
    }
    
    sendCache (media){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return callback(err)
            }
            logger.debug(`qzone ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith