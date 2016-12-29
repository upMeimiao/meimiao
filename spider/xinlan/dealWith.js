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
            page   = 1
        let option = {
            url : this.settings.listVideo+task.encode_id+"&ablumId="+task.id
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
            let length = result.content.list.length
            task.total = length
            this.deal(task,result.content,length,() => {
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
                this.getAllInfo( task, user.list[index], () => {
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
                this.getVideoInfo(task,(err,result) => {
                    cb(null,result)
                })
            },
            (cb) => {
                this.getComment(task,(err,result) => {
                    cb(null,result)
                })
            }
        ],(err,result) => {
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.videoId,
                title: video.videoTitle,
                desc: result[0].videoBrief,
                class: result[0].videoTypesDesc,
                long_t: video.duration,
                v_img: video.videoImage,
                v_url: video.videoShareUrl,
                a_create_time: this.getVidTime(result[0].publishYear),
                comment_num: result[1]
            }
            //logger.debug(media.comment_num)
            this.sendCache( media )
            callback()
        })
    }
    getVidTime( time ){
        if(time == ''){
            time = null
        }else{
            time = moment(time.replace(' ','T') + ".704Z").unix()
        }
        return time
    }
    getComment( task, callback ){
        let option = {
            url:'http://proxy.app.cztv.com/getCommentList.do?videoId='+task.encode_id+'&page=1&pageSize=20'
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频请求失败 ' + err)
                callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('新蓝网单个数据解析失败')

                return
            }
            callback(null,result.content.comment_count)
        })
    }
    getVideoInfo( task, callback ){
        let option = {
            url: this.settings.videoInfo+task.encode_id
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频请求失败 ' + err)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('新蓝网单个数据解析失败')
                return callback(e)
            }
            callback(null,result.content.list[0])
        })
    }

    sendCache (media,callback){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`新蓝网 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith