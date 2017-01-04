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
        let optionProxy = '',
            proxyStatus = false,
            proxy       = '',
            times       = 0
        if(proxyStatus && proxy){
            optionProxy = proxy
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
                    return false
                }
                times = 0
                optionProxy = _proxy
            })
        }
        return optionProxy
    }

    getUserInfo( task, callback ){
        let option = {
                url : this.settings.spiderAPI.weibo.userInfo+task.id
            },
            proxy  = ''

        proxy = this.getProxy(callback)
        
        if(!proxy){
            proxy = this.getProxy(callback)
        }
        option.proxy = proxy
        request.get( logger, option, ( err, result ) => {
            if(err){
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
                fans_num: result.followers_count
            }
            this.core.proxy.back(proxy, true)
            this.sendStagingUser(user)

            this.getVidTotal( task, result, option.proxy, (err,data) => {
                callback()
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
    getVidTotal( task, data, proxy, callback ){
        let containerid = data.tabsInfo.tabs[2].filter_group[0].containerid,
            option      = {
                url: this.settings.spiderAPI.weibo.videoList + containerid + "&page=0"
            },
            times       = 0
        option.proxy = proxy
        request.get( logger, option, ( err, result ) => {
            if (err) {
                this.core.proxy.back(proxy, false)
                proxy = this.getProxy(callback)
                return this.getVidTotal( task, data, proxy, callback )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                this.core.proxy.back(proxy, false)
                proxy = this.getProxy(callback)
                return this.getVidTotal( task, data, proxy, callback )
            }
            if(result.cardlistInfo == undefined){
                this.core.proxy.back(proxy, false)
                proxy = this.getProxy(callback)
                return this.getVidTotal( task, data, proxy, callback )
            }
            let total = result.cardlistInfo.total
            task.total = total
            this.core.proxy.back(proxy, true)
            this.getVidList( task, data, total, proxy, callback )
        })
        
    }
    getVidList( task, data, total, proxy, callback ){
        let pageNum     = 3
        async.whilst(
            () => {
                return task.page < pageNum
            },
            (cb) => {
                let containerid = data.tabsInfo.tabs[2].filter_group[0].containerid,
                    option = {
                        url: this.settings.spiderAPI.weibo.videoList + containerid + "&page=" + task.page
                    }
                option.proxy = proxy
                request.get( logger, option, ( err, result ) => {
                    if (err) {
                        this.core.proxy.back(proxy, false)
                        proxy = this.getProxy(callback)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        this.core.proxy.back(proxy, false)
                        proxy = this.getProxy(callback)
                        return cb()
                    }
                    if( result.cards == undefined ){
                        logger.debug('当前列表页的结构有问题，重新请求')
                        this.core.proxy.back(proxy, false)
                        proxy = this.getProxy(callback)
                        return cb()
                    }
                    if( result.cards.length <= 0 ){
                        pageNum = 0
                        return cb()
                    }
                    this.deal(task,result.cards,data,proxy,() => {
                        task.page++
                        pageNum++
                        this.core.proxy.back(proxy, true)
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
        }else{
            async.series([
                (cb) => {
                    this.getVideoInfo(video.mblog.mblogid,proxy,(err,result) => {
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
                    v_url: result[0].page_info == undefined ? null : result[0].page_info.media_info.mp4_sd_url
                }
                //logger.debug(media.a_create_time)
                this.sendCache( media, (err,data) => {
                    callback()
                })

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
                this.core.proxy.back(proxy, false)
                proxy = this.getProxy(callback)
                return this.getVideoInfo( id, proxy, callback)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                logger.info(result)
                this.core.proxy.back(proxy, false)
                proxy = this.getProxy(callback)
                return this.getVideoInfo( id, proxy, callback)
            }
            dataTime = new Date(result.created_at)
            dataTime = moment(dataTime).unix()
            result.created_at = dataTime == NaN ? '' : dataTime
            this.core.proxy.back(proxy, true)
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