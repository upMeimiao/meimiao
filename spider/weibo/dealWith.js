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

    getProxy(callback){
        let proxyStatus = false,
            proxy       = '',
            times       = 0
        if(proxyStatus && proxy){
            callback(null,proxy)
        }else{
            this.core.proxy.need(times, (err, _proxy) => {
                if(err){
                    if(err == 'timeout'){
                        return callback(null,'timeout')
                    }
                    logger.error('Get proxy occur error:', err)
                    times++
                    proxyStatus = false
                    this.core.proxy.back(proxy, false)
                    return callback(null,false)
                }
                times = 0
                callback(null,_proxy)
            })
        }
    }

    getUserInfo( task, callback ){
        let option = {
                url : this.settings.spiderAPI.weibo.userInfo+task.id
            }
        //logger.debug(option.url)
        this.getProxy((err,proxy) => {
            if (proxy == 'timeout') {
                return callback()
            }
            if(!proxy){
                return this.getUserInfo(task,callback)
            }
            option.proxy = proxy
            request.get( logger, option, ( err, result ) => {
                if(err){
                    logger.debug('用户的粉丝数请求错误',err)
                    this.core.proxy.back(proxy, false)
                    return this.getUserInfo( task, callback )
                }
                try{
                    result = JSON.parse(result.body)
                } catch (e){
                    logger.error(`json解析错误`)
                    logger.info(result)
                    this.core.proxy.back(proxy, false)
                    return this.getUserInfo( task, callback )
                }
                let user = {
                    platform: task.p,
                    bid: task.id,
                    fans_num: result.userInfo.followers_count
                }
                this.sendUser(user)
                this.sendStagingUser(user)
                if(result.tabsInfo.tabs[2].title !== '视频'){
                    task.NoVideo = true
                    this.getVidTotal( task, result, proxy, () => {
                        callback()
                    })
                }else{
                    task.NoVideo = false
                    this.getVidTotal( task, result, proxy, () => {
                        callback()
                    })
                }
            })
        })
    }
    sendUser (user){
        let option = {
            url: this.settings.sendFans,
            data: user
        }
        request.post( logger, option, (err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回微博视频用户 ${user.bid} 连接服务器失败`)
                return
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`微博视频用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return
            }
            if(back.errno == 0){
                logger.debug("微博视频用户:",user.bid + ' back_end')
            }else{
                logger.error("微博视频用户:",user.bid + ' back_error')
                logger.info(back)
                logger.info(`user info: `,user)
            }
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
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
    getVidTotal( task, data, proxy, callback ){
        let containerid = '',
            option      = {},
            times       = 0,
            total       = 0
        if(task.NoVideo){
            containerid = data.tabsInfo.tabs[1].containerid
            option.url  = this.settings.spiderAPI.weibo.videoList + containerid + '_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=0'
        }else{
            containerid = data.tabsInfo.tabs[2].containerid
            option.url  = this.settings.spiderAPI.weibo.videoList + containerid + "_time&page=0"
        }
        option.proxy = proxy
        request.get( logger, option, ( err, result ) => {
            if (err) {
                logger.debug('视频总量请求错误',err)
                this.core.proxy.back(proxy, false)
                this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                        return callback()
                    }
                    this.getVidTotal( task, data, proxy, callback )
                })
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                this.core.proxy.back(proxy, false)
                this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                        return callback()
                    }
                    this.getVidTotal( task, data, proxy, callback )
                })
                return
            }
            if(result.cardlistInfo == undefined){
                this.core.proxy.back(proxy, false)
                this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                        return callback()
                    }
                    this.getVidTotal( task, data, proxy, callback )
                })
                return
            }
            total = result.cardlistInfo.total
            task.total = total
            this.getVidList( task, data, total, proxy, () => {
                callback()
            })
        })
    }
    getVidList( task, data, total, proxy, callback ){
        let pageNum     = 3
        async.whilst(
            () => {
                return task.page < pageNum
            },
            (cb) => {
                let containerid = '',
                    option = {}
                if(task.NoVideo){
                    containerid = data.tabsInfo.tabs[1].containerid
                    option.url  = this.settings.spiderAPI.weibo.videoList + containerid + '_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=' + task.page
                }else{
                    containerid = data.tabsInfo.tabs[2].containerid
                    option.url  = this.settings.spiderAPI.weibo.videoList + containerid + "_time&page=" + task.page
                }
                option.proxy = proxy
                //logger.debug(option.url)
                request.get( logger, option, ( err, result ) => {
                    if (err) {
                        logger.debug('视频列表数据请求错误',err)
                        this.core.proxy.back(proxy, false)
                        this.getProxy((err, proxy) => {
                            if (proxy == 'timeout') {
                                return callback()
                            }
                            this.getVidList( task, data, total, proxy, callback )
                        })
                        return
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        this.core.proxy.back(proxy, false)
                        this.getProxy((err, proxy) => {
                            if (proxy == 'timeout') {
                                return callback()
                            }
                            this.getVidList( task, data, total, proxy, callback )
                        })
                        return
                    }
                    if( result.cards == undefined ){
                        logger.debug('当前列表页的结构有问题，重新请求')
                        this.core.proxy.back(proxy, false)
                        this.getProxy((err, proxy) => {
                            if (proxy == 'timeout') {
                                return callback()
                            }
                            this.getVidList( task, data, total, proxy, callback )
                        })
                        return
                    }
                    if( result.cards.length <= 0 ){
                        pageNum = 0
                        return cb()
                    }
                    //logger.info(task.page)
                    this.deal(task,result.cards,data,proxy,() => {
                        task.page++
                        pageNum++
                        cb()
                    })
                })
            },
            (err,result) => {
                logger.debug('没有数据了')
                callback()
            }
        )

    }
    deal( task, data, user, proxy, callback ){
        let index = 0,
            length = data.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getAllInfo( task, data[index], user, proxy, (err) => {
                    index++
                    cb()
                })
            },
            (err,data) => {
                callback()
            }
        )
    }
    getAllInfo( task, video, user, proxy, callback ){
        if(video.mblog == undefined){
            callback()
        }else if(video.mblog.pic_infos != undefined){
            callback()
        }else{
            async.series([
                (cb) => {
                    this.getVideoInfo(video.mblog.mblogid,proxy,(err,result) => {
                        this.core.proxy.back(proxy, true)
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
                    play_num: result[0].page_info.media_info.online_users_number,
                    comment_num: video.mblog.comments_count,
                    forward_num: video.mblog.reposts_count,
                    support: video.mblog.attitudes_count,
                    long_t: result[0].page_info.media_info.duration,
                    v_img: result[0].page_info.page_pic,
                    a_create_time: result[0].created_at,
                    v_url: video.mblog.mblogid
                }
                if(!media.play_num){
                    delete media.play_num
                }
                //logger.debug(media.a_create_time)
                this.sendCache(media)
                callback()
            })
        }
    }
    getVideoInfo( id, proxy, callback ){
        let option = {
                url:'http://api.weibo.cn/2/guest/statuses_show?from=1067293010&c=iphone&s=350a1d30&id='+id
            },
            dataTime = ''
        option.proxy = proxy
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频信息请求错误',err)
                this.core.proxy.back(proxy, false)
                this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                        return callback(null,'抛掉当前的')
                    }
                    this.getVideoInfo( id, proxy, callback )
                })
                return
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                logger.info(result)
                this.core.proxy.back(proxy, false)
                this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                        return callback(null,'抛掉当前的')
                    }
                    this.getVideoInfo( id, proxy, callback )
                })
                return
            }
            if(!result.page_info){
                return callback(null,'抛掉当前的')
            }
            if(!result.page_info.media_info){
                return callback(null,'抛掉当前的')
            }
            dataTime = new Date(result.created_at)
            dataTime = moment(dataTime).unix()
            result.created_at = dataTime == NaN ? '' : dataTime
            callback(null,result)
        })
    }

    sendCache (media){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`微博 ${media.aid} 加入缓存队列`)
        })
    }
}
module.exports = dealWith