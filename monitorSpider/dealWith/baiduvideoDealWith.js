/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require('../../lib/request.js')
const jsonp = function(data){
    return data
}
let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('baiduvideoDealWith instantiation ...')
    }
    baiduvideo ( task, callback ) {
        task.total = 0
        this.getVidTotal(task,(err,result) => {
            if(err){
                return callback(err)
            }
            callback(null,result)
        })
        
    }
    getVidTotal( task, callback ){
        let option = {
            url : api.baiduvideo.videoAlbum + task.id
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("baiduvideo",option.url,"total")
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
                this.storaging.errStoraging('baiduvideo',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baiduvideo',option.url,task.id,`百度视频获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            let $ = cheerio.load(result.body),
                script = $('script')[14].children[0].data.replace(/[\s\n\r]/g,''),
                startIndex = script.indexOf('[{"album":'),
                endIndex = script.indexOf(',frp:\'\','),
                listData = script.substring(startIndex,endIndex)
                listData = JSON.parse(listData)
            let length = listData.length,
                fan    = $('div.num-sec').eq(0).find('p.num').text(),
                user = {
                    platform: task.p,
                    bid: task.id,
                    fans_num: fan
                }
            task.total = $('div.num-sec').eq(1).find('p.num').text()
            this.getVidList(task,listData,length,(err) => {
                callback(null)
            })
    
        })
    }
    getVidList( task,  listData, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getListInfo(task,listData[index].album.id,(err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
        
    }
    getListInfo( task, listVid, callback ){
        let option = {},
            index  = 0,
            length = 2,
            page   = 1,
            num    = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                option.url = api.baiduvideo.videoList + listVid + '&page=' + page + '&_=' + new Date().getTime()
                request.get( logger, option, (err, result) => {
                    this.storaging.totalStorage ("baiduvideo",option.url,"list")
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
                        this.storaging.errStoraging("baiduvideo",option.url,task.id,err.code || "error",errType,"list")
                        if(num <= 1){
                            return cb()
                        }
                        num = 0
                        return callback(err)
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('baiduvideo',option.url,task.id,`百度视频获取list接口状态码错误${result.statusCode}`,"statusErr","list")
                        return callback(result.statusCode)
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch(e){
                        this.storaging.errStoraging('baiduvideo',option.url,task.id,"百度视频获取list接口json数据解析失败","doWithResErr","list")
                        if(num <= 1){
                            return cb()
                        }
                        num = 0
                        return callback(e)
                    }
                    if(!result.data){
                        this.storaging.errStoraging('baiduvideo',option.url,task.id,"百度视频获取list接口返回数据错误","resultErr","list")
                        return callback(result)
                    }
                    length = result.data.length
                    this.deal( task, result.data, length, (err) => {
                        index++
                        page++
                        cb()
                    })
                })
            },
            (err, result) => {
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
                this.getMedia( task, user[index], (err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getMedia( task, video, callback ){
        let timeout = 0
        async.series(
            [
                (cb) => {
                    this.getVidInfo(  task, video, timeout, (err,result) => {
                        cb(null,result)
                    })
                }
            ],
            (err, result) => {
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.id,
                    title: video.title.substr(0,100).replace(/"/g,''),
                    tag: video.tag.replace(/\$/g,''),
                    a_create_time: video.pub_time,
                    long_t: this.getVidTime(video.duration),
                    v_img: video.image_link,
                    desc: video.sub_title.substring(0,100),
                    play_num: result[0],
                    v_url: video.play_link
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
                //         this.storaging.errStoraging('baiduvideo',"",task.id,`百度视频播放量减少`,"playNumErr","info",media.aid,`${result}/${media.play_num}`)
                //     }
                //     this.storaging.sendDb(media/*,task.id,"info"*/)
                // })
                this.storaging.playNumStorage(media,"info")
                callback()
            }
        )
    }
    getVidTime( time ){
        let timeArr = time.split(':'),
            long_t  = '';
        if(timeArr.length == 2){
            long_t = parseInt(timeArr[0]*60) + parseInt(timeArr[1])
        }else if(timeArr.length == 3){
            long_t = parseInt((timeArr[0]*60)*60) + parseInt(timeArr[1]*60) + parseInt(timeArr[2])
        }
        return long_t;
    }
    getVidInfo( task, video, timeout, callback ){
        if(!video.play_link){
            return callback(null,'')
        }
        let option = {
            url : video.play_link
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("baiduvideo",option.url,"info")
            if(err){
                // logger.debug('单个视频Dom请求失败',err)
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
                //logger.error(errType)
                this.storaging.errStoraging("baiduvideo",option.url,task.id,err.code || "error",errType,"info")
                if(timeout < 1){
                    timeout++
                    return this.getVidInfo( task, video, timeout, callback )
                }
                timeout = 0
                return callback(null,'')
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baiduvideo',option.url,task.id,`百度视频获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback()
            }
            let $ = cheerio.load(result.body),
                playNum = $('p.title-info .play').text().replace('次','')
            if(!playNum&&playNum!==0){
                this.storaging.errStoraging("baiduvideo",option.url,task.id,"百度视频从dom中获取播放量失败","domBasedErr","info")
                return callback(null,'')
            }
            callback(null,playNum)
        })
    }
}
module.exports = dealWith