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
        task.page = 0
        //logger.debug('---')
        this.getUserInfo( task, ( err ) => {
            if(err){
                return callback( err )
            }
            callback( null, task.total )
        })
    }

    getUserInfo( task, callback ){
        let option = {
            url : this.settings.userInfo+task.id
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug(err)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error(`json解析错误`)
                logger.info(result)
                return callback()
            }
            this.getVidList( task, result, (err,data) => {
                callback()
            })
        })
    }
    
    getVidList( task, data, callback ){
        let total = 1000,
            num   = 0
        async.whilst(
            () => {
                return task.total <= total
            },
            (cb) => {
                task.page++
                let containerid = data.tabsInfo.tabs[2].filter_group[0].containerid,
                    option = {
                        url: this.settings.videoList + containerid + "&page=" + task.page
                    }
                //logger.debug(option.url)
                request.get( logger, option, ( err, result ) => {
                    if (err) {
                        if( num == 0 ){
                            logger.debug(err)
                            setTimeout(() => {
                                num++
                                task.page--
                                logger.debug('300毫秒之后重新请求一下')
                                return cb()
                            },300)
                        }else if( num == 1){
                            logger.debug('直接请求下一页')
                            cb()
                            return 
                        }else{
                            logger.debug(err)
                            logger.error( '接口请求错误 : ', err )
                            return callback(err)
                        }
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return
                    }
                    if(result.cardlistInfo.total == undefined){
                        setTimeout(() => {
                            task.page--
                            logger.debug('300毫秒之后重新请求一下')
                            return cb()
                        },300)
                    }
                    total = result.cardlistInfo.total
                    task.total += result.cards.length
                    //logger.debug('第'+task.page+'页')
                    this.deal(task,result.cards,data,() => {
                        cb()
                    })
                    
                    if( task.total >= total ){
                        task.total = total+1
                        return cb()
                    }
                })
            },
            (err,result) => {
                logger.debug('没有数据了')            
                callback()
            }
        )
            
    }
    deal( task, data, user, callback ){
        let index = 0,
            length = data.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getAllInfo( task, data[index], user, (err) => {
                    //logger.debug(index)
                    index++
                    cb()
                })
            },
            (err,data) => {
                callback()
            }
        )
    }
    getAllInfo( task, video, user, callback ){
        let num = 0
        if(video.mblog == undefined){
            callback()
        }else{
            async.series([
                (cb) => {
                    this.getVideoInfo(video.mblog.mblogid,num,(err,result) => {
                        cb(null,result)
                    })
                }
            ],(err,result) => {
                if(result[0] == '抛掉当前的'){
                    return callback()
                }else if(video.mblog.user == undefined){
                    return callback()
                }
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.mblog.id,
                    title: video.mblog.text,
                    desc: video.mblog.user.description == undefined ? '暂无描述' : video.mblog.user.description,
                    play_num: result[0].page_info == undefined ? null : result[0].page_info.media_info.online_users_number,
                    comment_num: video.mblog.comments_count,
                    forward_num: video.mblog.reposts_count,
                    support: video.mblog.attitudes_count,
                    long_t: result[0].page_info == undefined ? null : result[0].page_info.media_info.duration,
                    v_img: result[0].page_info == undefined ? null : result[0].page_info.page_pic,
                    a_create_time: result[0].created_at,
                    follow_num: user.followers_count,
                    v_url: result[0].page_info == undefined ? null : result[0].page_info.media_info.mp4_sd_url
                }
                //logger.debug(media.a_create_time)
                this.sendCache( media, (err,data) => {
                    callback()
                })
                
            })
        }
    }
    getVideoInfo( id, num, callback ){
        let option = {
            url:'http://api.weibo.cn/2/guest/statuses_show?from=1067293010&c=iphone&s=350a1d30&id='+id
        },
        dataTime = ''
        //console.log(option.url+'+++++')
        request.get( logger, option, ( err, result ) => {
            if(err){
                if( num == 0 ){
                    logger.debug(err)
                    setTimeout(() => { this.getVideoInfo( id, num++, callback) },300)
                    return logger.debug('300毫秒之后重新请求一下')
                }else if( num == 1){
                    logger.debug(err)
                    return callback(null,'抛掉当前的')
                }else{
                    logger.debug('微博请求失败 ' + err)
                    logger.debug(result)
                    return callback(err)
                }
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                logger.info(result)
                return
            }
            dataTime = new Date(result.created_at)
            dataTime = moment(dataTime).unix()
            result.created_at = dataTime
            callback(null,result)
        })
    }
    
    sendCache (media,callback){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`微博 ${media.aid} 加入缓存队列`)
            callback()
        })
    }
}
module.exports = dealWith