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
        
        let option = {
            url : this.settings.listVideo + task.id + "&cid=" + task.encode_id + '&_=' + new Date().getTime(),
            ua : 1
        }
        request.get( logger, option, ( err, result ) => {
            if (err) {
                logger.error( '接口请求错误 : ', err )
                return this.getVidList( task, callback )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                return this.getVidList( task, callback )
            }
            let length = result.data.length
            task.total = length
            this.deal(task,result.data,length,() => {
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
        let num = 0
        async.parallel([
            (cb) => {
                this.getVideoInfo(video.vid,num,(err,result) => {
                    cb(null,result)
                })
            },
            (cb) => {
                this.getComment(task,(err,result) => {

                    cb(null,result)
                })
            },
            (cb) => {
                this.getSupport( video.vid, (err, result) => {
                    cb(null,result)
                })
            },
            (cb) => {
                this.getSava( video.vid, (err, result) => {
                    cb(null,result)
                })
            }
        ],(err,result) => {
            if(result[0] == 'next'){
                return callback()
            }
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.vid,
                title: video.title.replace(/"/g,''),
                desc: result[0].videoBrief.replace(/"/g,''),
                class: result[0].videoTypesDesc,
                long_t: video.durationApp,
                v_img: video.pic,
                v_url: video.url,
                comment_num: result[1].total,
                support: result[2].supportNumber,
                save_num: result[3].hasCollect
            }
            this.sendCache(media)
            callback()
        })
    }
    getSava( vid, callback ){
        let option = {
            url: 'http://proxy.app.cztv.com/getCollectStatus.do?videoIdList='+vid,
            authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('收藏量请求失败')
                return callback(null,{hasCollect:''})
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('收藏量解析失败')
                logger.info(result)
                return callback(null,{hasCollect:''})
            }
            callback(null,result.content.list[0])
        })
    }
    getSupport( vid, callback ){
        let option = {
            url: 'http://proxy.app.cztv.com/getSupportStatus.do?videoIdList='+vid,
            authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
        }
        //logger.debug(option.url)
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('点赞量请求失败')
                return callback(null,{supportNumber:''})
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('点赞量解析失败')
                logger.info(result)
                return callback(null,{supportNumber:''})
            }
            if(result.content == undefined){
                return this.getSupport( vid, callback )
            }
            callback(null,result.content.list[0])
        })
    }
    getComment( task, callback ){
        let option = {
            url:'http://api.my.cztv.com/api/list?xid='+task.id+'&pid=6&type=video&page=1&rows=10&_='+ new Date().getTime(),
            authtoken:'103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('评论量请求失败 ', err)
                callback(null,{comment_count:''})
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('评论量数据解析失败')
                return callback(null,{comment_count:''})
            }
            callback(null,result)
        })
    }
    getVideoInfo( vid, num, callback ){
        let option = {
            url: this.settings.videoInfo+vid,
            authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频请求失败 ', err)
                if(num <= 1){
                    return this.getVideoInfo( task, num++, callback )
                }
                return callback(null,'next')
            }
            num = 0
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('新蓝网单个数据解析失败')
                if(num <= 1){
                    return this.getVideoInfo( task, num++, callback )
                }
                return callback(null,'next')
            }
            callback(null,result.content.list[0])
        })
    }

    sendCache (media){
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