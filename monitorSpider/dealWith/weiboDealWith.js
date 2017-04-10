/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require('../../lib/request.js')
let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('weiboDealWith instantiation ...')
    }
    weibo ( task, callback ) {
        task.total = 0
        task.page = 1
        this.getUserInfo( task, ( err,result ) => {
            if(err){
                return callback(err.message)
            }
            callback(err,result)
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
            url : api.weibo.userInfo+task.id
        }
        this.getProxy((err,proxy) => {
            if (proxy == 'timeout') {
                return callback()
            }
            if(!proxy){
                return this.getUserInfo(task,callback)
            }
            option.proxy = proxy
            request.get( logger, option, ( err, result ) => {
                this.storaging.totalStorage ("weibo",option.url,"user")
                if(err){
                    this.core.proxy.back(proxy, false)
                    return this.getUserInfo( task, callback )
                }
                try{
                    result = JSON.parse(result.body)
                } catch (e){
                    this.storaging.errStoraging('weibo',option.url,task.id,"微博user接口json解析错误","doWithResErr","user")
                    this.core.proxy.back(proxy, false)
                    return this.getUserInfo( task, callback )
                }
                if(result.errno == -200){
                    this.storaging.errStoraging('weibo',option.url,task.id,result.msg || "微博user账号有问题","responseErr","user")
                    this.core.proxy.back(proxy, false)
                    return this.getUserInfo( task, callback )
                }
                let user = {
                    platform: task.platform,
                    bid: task.id,
                    fans_num: result.userInfo && result.userInfo.followers_count
                }
                if(result.tabsInfo && result.tabsInfo.tabs[2].title !== '视频'){
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
    getVidTotal( task, data, proxy, callback ){
        let containerid = '',
            option      = {},
            times       = 0,
            total       = 0
        if(task.NoVideo){
            containerid = data.tabsInfo.tabs[1].containerid
            option.url  = api.weibo.videoList + containerid + '_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=0'
        }else{
            containerid = data.tabsInfo && data.tabsInfo.tabs[2].containerid
            option.url  = api.weibo.videoList + containerid + "_time&page=0"
        }
        option.proxy = proxy
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("weibo",option.url,"total")
            if (err) {
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
                this.storaging.errStoraging('weibo',option.url,task.id,"微博total接口json解析错误","doWithResErr","total")
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
        let page
        if(total % 20 != 0){
            page = Math.ceil(total / 20)
        }else{
            page = total / 20
        }
        async.whilst(
            () => {
                return task.page <= page
            },
            (cb) => {
                let containerid = '',
                    option = {}
                if(task.NoVideo){
                    containerid = data.tabsInfo.tabs[1].containerid
                    option.url  = api.weibo.videoList + containerid + '_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=' + task.page
                }else{
                    containerid = data.tabsInfo.tabs[2].containerid
                    option.url  = api.weibo.videoList + containerid + "_time&page=" + task.page
                }
                option.proxy = proxy
                request.get( logger, option, ( err, result ) => {
                    this.storaging.totalStorage ("weibo",option.url,"list")
                    if (err) {
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
                        this.storaging.errStoraging('weibo',option.url,task.id,"微博list接口json解析错误","doWithResErr","list")
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
                        this.storaging.errStoraging('weibo',option.url,task.id,"微博list接口返回的列表页的结构有问题","resultErr","list")
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
                        return cb()
                    }
                    //logger.info(task.page)
                    this.deal(task,result.cards,data,proxy,() => {
                        task.page++
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
                //logger.debug(data[index])
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
            // logger.debug('eeeeeeeeeeeeeeeeeeee')
            callback()
        }else if(video.mblog.pic_infos != undefined){
            // logger.debug('fffffffffffffffffffffffffffffff')
            callback()
        }else if(video.mblog.user !== undefined && task.id != video.mblog.user.id){
            // logger.debug('gggggggggggggggggggggggggg')
            callback()
        }else{
            async.series([
                (cb) => {
                    this.getVideoInfo(task,video.mblog.mblogid,proxy,(err,result) => {
                        this.core.proxy.back(proxy, true)
                        cb(null,result)
                    })
                }
            ],(err,result) => {
                if(result[0] == '抛掉当前的'){
                    // logger.debug('ddddddddddddddddddddddddd')
                    return callback()
                }else if(video.mblog.user == undefined){
                    // logger.debug('ccccccccccccccccccccc')
                    return callback()
                }
                let media = {
                    author: task.name,
                    platform: task.platform,
                    bid: task.id,
                    aid: video.mblog.id,
                    title: video.mblog.text.substr(0,80).replace(/"/g,''),
                    desc: video.mblog.user.description == undefined ? '' : video.mblog.user.description.substr(0,100).replace(/"/g,''),
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
                // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
                //     if(err){
                //         logger.debug("读取redis出错")
                //         return
                //     }
                //     if(result > media.play_num){
                //         this.storaging.errStoraging('weibo',"",task.id,`微博视频播放量减少`,"playNumErr","list",media.aid,`${result}/${media.play_num}`)
                //     }
                //     this.storaging.sendDb(media/*,task.id,"list"*/)
                // })
                this.storaging.playNumStorage(media,"list")
                // logger.debug("weibo media==============",media)
                callback()
            })
        }
    }
    getVideoInfo( task, id, proxy, callback ){
        let option = {
                url:'http://api.weibo.cn/2/guest/statuses_show?from=1067293010&c=iphone&s=6dd467f9&id='+id
            },
            dataTime = ''
        option.proxy = proxy
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("weibo",option.url,"info")
            if(err){
                this.core.proxy.back(proxy, false)
                this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                        return callback(null,'抛掉当前的')
                    }
                    this.getVideoInfo( task, id, proxy, callback )
                })
                return
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('weibo',option.url,task.id,"微博info接口json数据解析失败","doWithResErr","info")
                this.core.proxy.back(proxy, false)
                this.getProxy((err, proxy) => {
                    if (proxy == 'timeout') {
                        return callback(null,'抛掉当前的')
                    }
                    this.getVideoInfo( task, id, proxy, callback )
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
}
module.exports = dealWith