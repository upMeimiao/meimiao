/**
 * Created by junhao on 16/6/21.
 */
const URL = require('url')
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const EventProxy = require( 'eventproxy' )
const request = require('../../lib/request.js')
const md5 = require('js-md5')
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
        logger.trace('DealWith instantiation ...')
    }
    cctv ( task, callback ) {
        task.total = 0
        task.event = new EventProxy()
        async.parallel(
            {
                user : (callback) => {
                    this.getFans(task,(err,result)=>{
                        callback(err,result)
                    })
                },
                video : (callback) => {
                    this.getVidTotal(task,(err,result)=>{
                        if(err){
                            return callback(err)
                        }
                        callback(err,result)
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                callback(err,result)
            }
        )
        
    }
    
    getFans ( task, callback){
        let option = {
            url: api.cctv.fans + task.id + "&_=" + new Date().getTime()
        }
        request.get( logger, option, (err, result)=>{
            this.storaging.totalStorage ("cctv",option.url,"fans")
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
                this.storaging.errStoraging('cctv',option.url,task.id,err.code || "error",errType,"fans")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('cctv',option.url,task.id,`cctv获取fans接口状态码错误${result.statusCode}`,"statusErr","fans")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('cctv',option.url,task.id,"cctv获取fans接口json数据解析失败","doWithResErr","fans")
                return callback(e)
            }
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: result.data.fans_count
            }
            callback()
        })
    }
    getVidTotal( task, callback ){
        let option = {
            url: 'http://my.xiyou.cntv.cn/'+task.id+'/video-2-1.html',
            ua: 1
        },
        sign       = 1
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("cctv",option.url,"total")
            if (err) {
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
                this.storaging.errStoraging("cctv",option.url,task.id,err.code || "error",errType,"total")
                setTimeout(() => {
                    this.getVidTotal(task,callback)
                },3000)
                return
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('cctv',option.url,task.id,"cctv total接口状态码错误","statusErr","total")
                setTimeout(() => {
                    this.getVidTotal(task,callback)
                },3000)
                return
            }
            let $          = cheerio.load(result.body),
                total      = $('li.video strong').text(),
                page       = $('div.pagetotal span').eq(1).text().replace(/[\s]/g,'').replace('共','').replace('页','')
                task.total = total
            //logger.debug(total)
            if(total == 0){
                setTimeout(() => {
                    this.getVidTotal(task,callback)
                },100)
                return
            }
            this.getVidList(task,page,sign,callback)
        })
    }
    
    getVidList( task,  page, sign, callback ){
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                let option = {
                    url : 'http://my.xiyou.cntv.cn/'+task.id+'/video-2-'+sign+'.html'
                }
                request.get( logger, option, ( err, result ) => {
                    this.storaging.totalStorage ("cctv",option.url,"list")
                    if (err) {
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
                        this.storaging.errStoraging("cctv",option.url,task.id,err.code || "error",errType,"list")
                        setTimeout(() => {
                            this.getVidList(task,page,sign,callback)
                        },3000)
                        return
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('cctv',option.url,task.id,"cctv list接口状态码错误","statusErr","list")
                        setTimeout(() => {
                            this.getVidList(task,callback)
                        },3000)
                        return
                    }
                    let $       = cheerio.load(result.body),
                        length  = $('div.shipin_list_boxs>ul>li').length,
                        content = $('div.shipin_list_boxs>ul')
                    if(length == 0){
                        setTimeout(() => {
                            this.getVidList(task,page,sign,callback)
                        },300)
                        return
                    }
                    //logger.debug(length+' | '+sign)
                    this.deal(task,content,length,() => {
                        sign++
                        cb()
                    })
                })
            },
            (err,result) => {
                logger.debug('当前用户数据请求完成')
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
                this.getAllInfo( task, user.find('li').eq(index), () => {
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
        let vid = video.find('div.images>a').attr('href')
            vid = URL.parse(vid,true).pathname
            vid = vid.replace('/v-','').replace('.html','')
        
        let option = {
            url: api.cctv.videoInfo+vid
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("cctv",option.url,"info")
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
                this.storaging.errStoraging('cctv',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('cctv',option.url,task.id,`cctv获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('cctv',option.url,task.id,"cctv获取info接口json数据解析失败","doWithResErr","info")
                return
            }
            let time = new Date(result.data[0].uploadTime+ ' 00:00:00')
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: result.data[0].videoId,
                title: result.data[0].title.replace(/"/g,''),
                comment_num: result.data[0].commentCount,
                class: result.data[0].categoryName,
                tag: result.data[0].videoTags,
                desc: result.data[0].videoDetailInfo.replace(/<br\/>/g,'').substring(0,100).replace(/"/g,''),
                support: result.data[0].upCount,
                step: result.data[0].downCount,
                long_t: result.data[0].timeSpan,
                v_img: result.data[0].imagePath,
                play_num: result.data[0].playCount.replace(/,/g,''),
                save_num: result.data[0].favCount,
                // v_url: 'http://xiyou.cctv.com/v-'+result.data[0].videoId+'.html',
                a_create_time: moment(time).format('X')

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
            //         this.storaging.errStoraging('cctv',`${option.url}`,task.id,`cctv视频播放量减少`,"playNumErr","info",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"info"*/)
            // })
            this.storaging.playNumStorage(media,"info")
            // logger.debug("btime media==============",media)
            callback() 
        })
    }
}
module.exports = dealWith