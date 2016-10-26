/**
 * Created by ifable on 16/6/21.
 */
const async = require( 'async' )
const moment = require('moment')
const request = require( '../lib/req' )
let logger
const jsonp = function (data) {
    return data
}
class dealWith {
    constructor ( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0
        this.getTotal( task, ( err ) => {
            if(err){
                return callback( err )
            }
            return callback(null,task.total)
        })
    }
    getTotal ( task, callback ) {
        logger.debug("开始获取视频总页数")
        let option = {}
        option.url = this.settings.newList + task.id + "/queryvideolist?callback=jsonp&orderType=0&pageSize=48&searchTitleString=&currentPage=1&_="+ (new Date()).getTime()
        option.referer = `http://chuang.le.com/u/${task.id}/videolist`
        request.get(option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if( result.statusCode != 200){
                logger.error(`获取乐视视频总数状态码错误:${result.statusCode}`)
                return callback(true)
            }
            try {
                result = eval("("+result.body+")")
            } catch (e){
                logger.error('jsonp解析错误:',e)
                logger.info(result)
                return callback(e)
            }
            let page = result.data.totalPage
            task.total = page * 48
            this.getList(task,page, () => {
                callback()
            })
        })
    }
    getList ( task, page, callback ) {
        let sign = 1,
            option = {}
        option.referer = `http://chuang.le.com/u/${task.id}/videolist`
        async.whilst(
            () => {
                return sign <= page
            },
            ( cb ) => {
                logger.debug("开始获取第"+ sign +"页视频列表")
                option.url = this.settings.newList + task.id + "/queryvideolist?callback=jsonp&orderType=0&pageSize=48&searchTitleString=&currentPage=" + sign + "&_="+ (new Date()).getTime()
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return cb()
                    }
                    if(result.statusCode != 200){
                        logger.error(`获取第${sign}页数据状态码错误${result.statusCode}`)
                        return cb()
                    }
                    try {
                        result = eval("("+result.body+")")
                    } catch (e){
                        logger.error(`jsonp解析错误`)
                        logger.info(result)
                        return cb()
                    }
                    let backList = result.data.list
                    //logger.debug(backList)
                    this.deal(task,backList, () => {
                        sign++
                        cb()
                    })
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    deal ( task, list, callback ) {
        let index = 0,
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            ( cb ) => {
                this.info( task, list[index], () => {
                    index++
                    cb()
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    info ( task, video, callback ) {
        let id = video.vid
        async.parallel(
            [
                ( callback ) => {
                    this.getInfo( id, ( err, data ) =>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,data)
                    })
                },
                ( callback ) => {
                    this.getTime( id, ( err, time ) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,time)
                    })
                },
                ( callback ) => {
                    this.getDesc( id, ( err, desc ) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,desc)
                    })
                }
            ], (err,result) => {
                if(err){
                    return callback(err)
                }
                let media = {
                    author: task.name,
                    platform: 3,
                    bid: task.id,
                    aid: id,
                    title: video.title,
                    desc: result[2],
                    play_num: result[0].play_count,
                    comment_num: result[0].vcomm_count,
                    support: result[0].up,
                    step: result[0].down,
                    a_create_time: result[1]
                }
                this.sendCache(media)
                callback()
            }
        )
    }
    getInfo ( id, callback ) {
        let option = {
            url: this.settings.info + id + "&_=" + (new Date()).getTime()
        }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error(`getInfo code error: ${result.statusCode}`)
                return callback(true)
            }
            logger.debug(result.body)
            let backData
            try {
                backData = eval(result.body)
            } catch (e){
                logger.error(`getInfo jsonp error: `,e)
                logger.error(result.body)
                return callback(e)
            }
            if(!backData || backData.length === 0){
                logger.error(`getInfo 异常`)
                return callback(true)
            }
            logger.debug('188: ',backData)
            let info = backData[0]
            callback(null,info)
        })
    }
    getTime ( id, callback ) {
        let option = {
            url: this.settings.time + id
        }
        request.get( option, ( err, result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let time = result.version_time
            callback(null,moment(time).unix())
        })
    }
    getDesc ( id, callback ) {
        let option = {
            url: this.settings.desc + id,
            referer: 'http://m.le.com/vplay_' + id +'.html'
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let backData  = result.data.introduction
            backData ? callback(null,backData.video_description) : callback(null,'')
        })
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`乐视视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith