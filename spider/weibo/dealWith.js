/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../../lib/request' )
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
        task.page = 1
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
                url : this.settings.spiderAPI.weibo.userInfo+task.id
            },
            num = 0,
            proxyStatus = false,
            proxy       = '',
            times       = 0
        if(proxyStatus && proxy){
            option.proxy = proxy
            request.get( logger, option, ( err, result ) => {
                if(err){
                    times++
                    proxyStatus = false
                    this.core.proxy.back(proxy,false)
                    return this.getUserInfo( task, callback )
                }
                times = 0
                try{
                    result = JSON.parse(result.body)
                } catch (e){
                    logger.debug('用户的粉丝数解析失败')
                    logger.info(result)
                    times++
                    proxyStatus = false
                    this.core.proxy.back(proxy,false)
                    return this.getUserInfo( task, callback )
                }
                times = 0
                let user = {
                    platform: task.p,
                    bid: task.id,
                    fans_num: result.followers_count
                }
                this.sendStagingUser(user)

                this.getVidTotal( task, result, num, (err,data) => {
                    callback()
                })

            })
        }else{
            this.core.proxy.need(times, (err, _proxy) => {
                if(err){
                    if(err == 'timeout'){
                        return callback('Get proxy timesout!!')
                    }
                    logger.error('Get proxy occur error:', err)
                    times++
                    proxyStatus = false
                    this.core.proxy.back(proxy, false)
                    return this.getUserInfo( task, callback )
                }
                times = 0
                option.proxy = _proxy
                request.get( logger, option, ( err, result ) => {
                    if(err){
                        times++
                        proxyStatus = false
                        this.core.proxy.back(proxy,false)
                        return this.getUserInfo( task, callback )
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch (e){
                        logger.error(`json解析错误`)
                        logger.info(result)
                        times++
                        proxyStatus = false
                        return this.getUserInfo( task, callback )
                    }
                    let user = {
                        platform: task.p,
                        bid: task.id,
                        fans_num: result.followers_count
                    }
                    this.sendStagingUser(user)

                    this.getVidTotal( task, result, num, (err,data) => {
                        callback()
                    })

                })
            })
        }
    }
    sendUser (user){
        let option = {
            url: this.settings.sendFans,
            data: user
        }
        request.post( logger, option, (err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回搜狐视频用户 ${user.bid} 连接服务器失败`)
                return
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`搜狐视频用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return
            }
            if(back.errno == 0){
                logger.debug("搜狐视频用户:",user.bid + ' back_end')
            }else{
                logger.error("搜狐视频用户:",user.bid + ' back_error')
                logger.info(back)
                logger.info(`user info: `,user)
            }
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.caihongip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( logger, option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',result)
                return
            }
            if(result.errno == 0){
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.info(result)
            }
        })
    }
    getVidTotal( task, data, num, callback ){
        let containerid = data.tabsInfo.tabs[2].filter_group[0].containerid,
            option      = {
                url: this.settings.spiderAPI.weibo.videoList + containerid + "&page=0"
            },
            proxyStatus = false,
            proxy       = '',
            times       = 0
        if(proxyStatus && proxy){
            option.proxy = proxy
            request.get( logger, option, ( err, result ) => {
                if (err) {
                    times++
                    proxyStatus = false
                    this.core.proxy.back(proxy,false)
                    return this.getVidTotal( task, data, num, callback )
                }
                times = 0
                try{
                    result = JSON.parse(result.body)
                }catch (e){
                    logger.error('json数据解析失败')
                    logger.info(result)
                    times++
                    proxyStatus = false
                    this.core.proxy.back(proxy,false)
                    return this.getVidTotal( task, data, num, callback )
                }
                time = 0
                //logger.debug(result.cardlistInfo)
                if(result.cardlistInfo == undefined){
                    times++
                    proxyStatus = false
                    this.core.proxy.back(proxy,false)
                    return this.getVidTotal( task, data, num, callback )
                }
                times = 0
                let total = result.cardlistInfo.total
                task.total = total
                logger.debug(total)
                this.getVidList( task, data, total, callback )
            })
        }else{
            this.core.proxy.need(times, (err, _proxy) => {
                if(err) {
                    if(err == 'timeout'){
                        return callback('Get proxy timesout!!')
                    }
                    logger.error('Get proxy occur error:', err)
                    times++
                    proxyStatus = false
                    this.core.proxy.back(proxy, false)
                    return this.getVidTotal( task, data, num, callback )
                }
                times = 0
                option.proxy = _proxy
                request.get( logger, option, ( err, result ) => {
                    if (err) {
                        times++
                        proxyStatus = false
                        this.core.proxy.back(proxy,false)
                        return this.getVidTotal( task, data, num, callback )
                    }
                    times = 0
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        times++
                        proxyStatus = false
                        this.core.proxy.back(proxy,false)
                        return this.getVidTotal( task, data, num, callback )
                    }
                    times = 0
                    //logger.debug(result.cardlistInfo)
                    if(result.cardlistInfo == undefined){
                        times++
                        proxyStatus = false
                        this.core.proxy.back(proxy,false)
                        return this.getVidTotal( task, data, num, callback )
                    }
                    times = 0
                    let total = result.cardlistInfo.total
                    task.total = total
                    this.getVidList( task, data, total, callback )
                })
            })
        }
    }
    getVidList( task, data, total, callback ){
        let num         = 0,
            pageNum     = 3,
            times       = 0,
            proxyStatus = false,
            proxy       = ''
        async.whilst(
            () => {
                return task.page < pageNum
            },
            (cb) => {
                let containerid = data.tabsInfo.tabs[2].filter_group[0].containerid,
                    option = {
                        url: this.settings.spiderAPI.weibo.videoList + containerid + "&page=" + task.page
                    }
                if(proxyStatus && proxy){
                    option.proxy = proxy
                    request.get( logger, option, ( err, result ) => {
                        if (err) {
                            times++
                            proxyStatus = false
                            this.core.proxy.back(proxy,false)
                            return cb()
                        }
                        times = 0
                        try{
                            result = JSON.parse(result.body)
                        }catch (e){
                            logger.error('json数据解析失败')
                            logger.info(result)
                            times++
                            proxyStatus = false
                            this.core.proxy.back(proxy,false)
                            return cb()
                        }
                        times = 0
                        if( result.cards == undefined ){
                            logger.debug('当前列表页的结构有问题，重新请求')
                            times++
                            proxyStatus = false
                            this.core.proxy.back(_proxy,false)
                            return cb()
                        }
                        times = 0
                        if( result.cards.length <= 0 ){
                            pageNum = 0
                            return cb()
                        }
                        this.deal(task,result.cards,data,() => {
                            task.page++
                            pageNum++
                            cb()
                        })
                    })
                }else{
                    this.core.proxy.need(times, (err, _proxy) => {
                        if(err) {
                            if(err == 'timeout'){
                                return callback('Get proxy timesout!!')
                            }
                            logger.error('Get proxy occur error:', err)
                            times++
                            proxyStatus = false
                            this.core.proxy.back(proxy, false)
                            return cb()
                        }
                        times = 0
                        option.proxy = _proxy
                        request.get( logger, option, ( err, result ) => {
                            if (err) {
                                times++
                                proxyStatus = false
                                this.core.proxy.back(_proxy, false)
                                return cb()
                            }
                            times = 0
                            try{
                                result = JSON.parse(result.body)
                            }catch (e){
                                logger.error('json数据解析失败')
                                logger.info(result.body)
                                times++
                                proxyStatus = false
                                this.core.proxy.back(_proxy,false)
                                return cb()
                            }
                            times = 0
                            if( result.cards == undefined ){
                                logger.debug('当前列表页的结构有问题，重新请求')
                                times++
                                proxyStatus = false
                                this.core.proxy.back(_proxy,false)
                                return cb()
                            }
                            times = 0
                            if( result.cards.length <= 0 ){
                                pageNum = 0
                                return cb()
                            }
                            this.deal(task,result.cards,data,() => {
                                task.page++
                                pageNum++
                                cb()
                            })
                        })
                    })
                }

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
                    desc: video.mblog.user.description == undefined ? '' : video.mblog.user.description,
                    play_num: result[0].page_info == undefined ? null : result[0].page_info.media_info.online_users_number,
                    comment_num: video.mblog.comments_count,
                    forward_num: video.mblog.reposts_count,
                    support: video.mblog.attitudes_count,
                    long_t: result[0].page_info == undefined ? null : result[0].page_info.media_info.duration,
                    v_img: result[0].page_info == undefined ? null : result[0].page_info.page_pic,
                    a_create_time: result[0].created_at,
                    //follow_num: user.followers_count,
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
            result.created_at = dataTime == NaN ? '' : dataTime
            logger.debug(result.created_at)
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