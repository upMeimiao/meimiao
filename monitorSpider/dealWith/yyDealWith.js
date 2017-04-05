/**
 * Created by yunsong on 16/8/5.
 */
const async = require( 'async' )
const request = require( '../../lib/request' )
const cheerio = require( 'cheerio' )
const moment = require( 'moment' )

let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('DealWith instantiation ...')
    }
    yy (task,callback) {
        task.total = 0
        this.getTotal (task,(err,result) => {
            if(err){
                return callback(err)
            }
            callback(null,result)
        })
    }
    getTotal (task,callback){
        let option = {
            url: api.yy.userInfo + task.id
        }
        request.get(logger,option,(err,result) => {
            this.storaging.totalStorage ("yy",option.url,"total")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                this.storaging.errStoraging('yy',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('yy',option.url,task.id,`yy获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            let $ = cheerio.load(result.body),
                fans_text = $('.fans-link').text(),
                live_num = $('.live-col .title-num').text().replace(/（/g,'').replace(/）/g,''),
                sq_num = $('.shenqu-col .title-num').text().replace(/（/g,'').replace(/）/g,''),
                dp_num = $('.duanpai-col .title-num').text().replace(/（/g,'').replace(/）/g,'')
            if(!$('.fans-link')||!$('.live-col .title-num')||!$('.shenqu-col .title-num')||!$('.duanpai-col .title-num')){
                this.storaging.errStoraging('yy',option.url,task.id,`yy total接口从dom中获取信息失败`,"domBasedErr","total")
                return callback()
            }
            let user = {
                platform: 20,
                bid: task.id,
                fans_num: fans_text.replace(/,/g,'')
            }
            task.total = Number(live_num) + Number(sq_num) + Number(dp_num)
            async.parallel({
                live: (callback) => {
                    this.getLive( task, live_num, (err,result) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,result)
                    })
                },
                shenqu: (callback) => {
                    this.getSlist( task, sq_num, (err,result) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,result)
                    })
                },
                duanpai: (callback) => {
                    this.getDlist( task, dp_num, (err,result) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,result)
                    })
                }
            },(err,result) => {
                if(err){
                    return callback(err)
                }
                // logger.debug('result : ',result)
                callback()
            })
        })
    }
    getLive ( task, total, callback ) {
        let sign = 1,
            option = {},
            page,list
        if(total % 20 == 0){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option.url = api.yy.liveList + task.id + "&pageNum=" + sign
                request.get( logger, option, (err,result) => {
                    this.storaging.totalStorage ("yy",option.url,"live")
                    if(err){
                        let errType
                        if(err.code){
                            if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                                errType = "timeoutErr"
                            } else{
                                errType = "responseErr"
                            }
                        } else{
                            errType = "responseErr"
                        }
                        // logger.error(errType)
                        this.storaging.errStoraging('yy',option.url,task.id,err.code || "error",errType,"live")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('yy',option.url,task.id,`yy获取live接口状态码错误${result.statusCode}`,"statusErr","live")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        this.storaging.errStoraging('yy',option.url,task.id,"yy获取live接口json数据解析失败","doWithResErr","live")
                        return cb()
                    }
                    list = result.data.list
                    if(list){
                        this.deal( task, option.url, list, '直播回放', () => {
                            sign++
                            cb()
                        })
                    }else{
                        sign++
                        cb()
                    }
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getSlist ( task, total, callback) {
        let sign = 1,
            option,
            page,
            list
        if(total % 20 == 0){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option = {
                    url: api.yy.shenquList + task.id + "&p=" + sign
                }
                request.get( logger, option, (err,result) => {
                    this.storaging.totalStorage ("yy",option.url,"slist")
                    if(err){
                        let errType
                        if(err.code){
                            if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                                errType = "timeoutErr"
                            } else{
                                errType = "responseErr"
                            }
                        } else{
                            errType = "responseErr"
                        }
                        // logger.error(errType)
                        this.storaging.errStoraging('yy',option.url,task.id,err.code || "error",errType,"slist")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('yy',option.url,task.id,`yy获取slist接口状态码错误${result.statusCode}`,"statusErr","slist")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        this.storaging.errStoraging('yy',option.url,task.id,"yy获取slist接口json数据解析失败","doWithResErr","slist")
                        return cb()
                    }
                    list = result.data
                    if(list){
                        this.deal( task, option.url, list, '神曲', () => {
                            sign++
                            cb()
                        })
                    }else{
                        sign++
                        cb()
                    }
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getDlist( task, total, callback) {
        let sign = 1,
            option,
            page,
            list
        if(total % 20 == 0){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option = {
                    url: api.yy.duanpaiList + task.id + "&p=" + sign
                }
                request.get( logger, option, (err,result) => {
                    this.storaging.totalStorage ("yy",option.url,"dlist")
                    if(err){
                        let errType
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                            errType = "timeoutErr"
                        } else{
                            errType = "responseErr"
                        }
                        // logger.error(errType)
                        this.storaging.errStoraging('yy',option.url,task.id,err.code || "error",errType,"dlist")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('yy',option.url,task.id,`yy获取dlist接口状态码错误${result.statusCode}`,"statusErr","dlist")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        this.storaging.errStoraging('yy',option.url,task.id,"yy获取dlist接口json数据解析失败","doWithResErr","dlist")
                        return cb()
                    }
                    list = result.data
                    if(list){
                        this.deal( task, option.url, list, '短片', () => {
                            sign++
                            cb()
                        })
                    }else{
                        sign++
                        cb()
                    }
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, url, list, type, callback) {
        let index = 0,video
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                video = list[index]
                if(video.pid){
                    this.getInfoL( task, url, type, video,(err) => {
                        index++
                        cb()
                    })
                }else{
                    this.getInfo( task, url, type, video,(err) => {
                        index++
                        cb()
                    })
                }
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfoL ( task, url, type, data, callback ) {
        let title = data.title
        if(title == ''){
            title = "btwk_caihongip"
        }
        let media = {
            author: task.name,
            platform: 20,
            bid: task.id,
            aid: data.pid,
            title: title,
            play_num: Number(data.viewer) + Number(data.recordViewer),
            a_create_time: data.beginTime,
            long_t: moment.duration(data.duration).asSeconds(),
            v_url: data.playUrl,
            v_img: data.imageUrl,
            class: type
        }
        if(!media.play_num){
            return
        }
        // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
        //     if(err){
        //         logger.debug("读取redis出错")
        //         return
        //     }
        //     if(result > media.play_num){
        //         this.storaging.errStoraging('yy',`${url}`,task.id,`yy视频播放量减少`,"playNumErr","list",media.aid,`${result}/${media.play_num}`)
        //     }
        //     this.storaging.sendDb(media/*,task.id,"list"*/)
        // })
        this.storaging.playNumStorage(media,"list")
        callback()
    }
    getInfo ( task, url, type, data, callback ) {
        let title,play = data.watchCount
        if(type == '神曲'){
            title = data.songname
        }
        if( type == '短片'){
            title = data.resdesc
        }
        if(title == ''){
            title = "btwk_caihongip"
        }
        if(play.indexOf('万') != -1 ){
            play = play.replace('万','') * 10000
        }else if(play.indexOf('亿') != -1){
            play = play.replace('亿','') * 100000000
        }
        let time = data.addtime,
            a_create_time = moment(time).format('X'),
            media = {
                author: task.name,
                platform: 20,
                bid: task.id,
                aid: data.resid,
                title: title.substr(0,100).replace(/"/g,''),
                desc: data.resdesc.substr(0,100).replace(/"/g,''),
                play_num: play,
                save_num: data.favorCount,
                forward_num: data.shareCount,
                comment_num: data.commentCount,
                support: data.likeCount,
                a_create_time: a_create_time,
                long_t: data.duration ? moment.duration(data.duration).asSeconds() : null,
                v_img: data.snapshoturl,
                class: type,
                v_url: data.playUrl
            }
        if(!media.play_num){
            return
        }
        // this.core.MSDB.hget(`apiMonitor:${media.author}:play_num:${media.aid}`,"play_num",(err,result)=>{
        //     if(err){
        //         logger.debug("读取redis出错")
        //         return
        //     }
        //     if(result > media.play_num){
        //         this.storaging.errStoraging('yy',`${url}`,task.id,`yy视频播放量减少`,"playNumErr","list",media.aid,`${result}/${media.play_num}`)
        //     }
        //     this.storaging.sendDb(media)
        // })
        this.storaging.playNumStorage(media,"list")
        if(!media.long_t){
            delete media.long_t
        }
        callback()
    }
}
module.exports = dealWith