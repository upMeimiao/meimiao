/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
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
        this.getVidList( task, ( err ) => {
            if(err){
                return callback( err )
            }
            callback( null, task.total )
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
                        url : this.settings.listVideo + task.id + "&month="+ month + "&_=" + (new Date()).getTime()
                    }
                request.get( logger, option, ( err, result ) => {
                    if (err) {
                        logger.error( '接口请求错误 : ', err )
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return
                    }
                    let length = result.data.list.length
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
        async.series([
            (cb) => {
                this.getVideoInfo(task,video,(err,result) => {
                    cb(null,result)
                })
            },
            (cb) => {
                this.getPlayNum(video,(err,result) => {
                    cb(null,result)
                })
            },
            (cb) => {
                this.getClass(video,(err,result) => {
                    cb(null,result)
                })
            }
        ],(err,result) => {
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.video_id,
                title: video.t1,
                long_t: result[0].info.duration,
                v_img: video.img,
                v_url: "http://www.mgtv.com"+video.url,
                play_num: result[1].all,
                class: result[2].fstlvlName
            }
            //logger.debug(media.class)
            this.sendCache( media )
            callback()
        })
    }
    getClass( video, callback ){
        let option = {
            url: 'http://mobile.api.hunantv.com/v7/video/info?device=iPhone&videoId=' + video.video_id
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('视频播放量请求失败 ' + err)
                callback(err,null)
            }
            if(result.statusCode != 200 ){
                logger.error('芒果状态码错误',result.statusCode)
                return callback(true,{code:102,p:1})
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('_Callback数据解析失败')
                return
            }
            callback(null,result.data)
        })
    }
    getPlayNum( video, callback ){
        let option = {
            //用户的信息后边参数是cid,播放量是vid
            url: this.settings.userInfo + "vid=" + video.video_id
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('视频播放量请求失败 ' + err)
                callback(err,null)
            }
            if(result.statusCode != 200 ){
                logger.error('芒果状态码错误',result.statusCode)
                return callback(true,{code:102,p:1})
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('_Callback数据解析失败')
                return
            }
            callback(null,result.data)
        })
    }
    getVideoInfo( task, video, callback ){
        let option = {
            url: this.settings.videoInfo + video.video_id
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频请求失败 ' + err)
                callback(err,null)
            }
            if(result.statusCode != 200 ){
                logger.error('芒果状态码错误',result.statusCode)
                return callback(true,{code:102,p:1})
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('_Callback数据解析失败')
                return
            }
            callback(null,result.data)
        })
    }
    
    sendCache (media){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`芒果TV ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith