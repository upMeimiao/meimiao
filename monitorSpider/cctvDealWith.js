/**
 * Created by junhao on 16/6/21.
 */
const URL = require('url')
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const EventProxy = require( 'eventproxy' )
const request = require('../lib/request.js')
const md5 = require('js-md5')
const jsonp = function(data){
    return data
}
let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
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
            this.storaging.judgeRes ("cctv",option.url,task.id,err,result,"fans")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`CCTV json数据解析失败`)
                this.storaging.errStoraging('cctv',option.url,task.id,"cctv获取fans接口json数据解析失败","doWithResErr","fans")
                return callback(e)
            }
            // let user = {
            //     platform: task.p,
            //     bid: task.id,
            //     fans_num: result.data.fans_count
            // }
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
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("cctv",option.url,task.id,err.code || err,errType,"total")
                setTimeout(() => {
                    this.getVidTotal(task,callback)
                },3000)
                return
            }
            if(!result){
                this.storaging.errStoraging('cctv',option.url,task.id,"cctv total接口无返回结果","responseErr","total")
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
            if(!total || page){
                this.storaging.errStoraging('cctv',option.url,task.id,"total从dom中取total与page信息失败","domBasedErr","total")
                setTimeout(() => {
                    this.getVidTotal(task,callback)
                },100)
                return
            }
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
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                            errType = "timeoutErr"
                        } else{
                            errType = "responseErr"
                        }
                        //logger.error(errType)
                        this.storaging.errStoraging("cctv",option.url,task.id,err.code || err,errType,"list")
                        setTimeout(() => {
                            this.getVidList(task,page,sign,callback)
                        },3000)
                        return
                    }
                    if(!result){
                        this.storaging.errStoraging('cctv',option.url,task.id,"cctv list接口无返回结果","responseErr","list")
                        setTimeout(() => {
                            this.getVidTotal(task,callback)
                        },3000)
                        return
                    }
                    let $       = cheerio.load(result.body),
                        length  = $('div.shipin_list_boxs>ul>li').length,
                        content = $('div.shipin_list_boxs>ul')
                    if(!length || !content){
                        this.storaging.errStoraging('cctv',option.url,task.id,"cctv从dom中获取content与length信息失败","domBasedErr","list")
                        setTimeout(() => {
                            this.getVidList(task,page,sign,callback)
                        },300)
                        return
                    }
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
            this.storaging.judgeRes ("cctv",option.url,task.id,err,result,"info")
            if(!result){
                return 
            }
            if(!result.body){
                return 
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
            this.core.MSDB.hget(`apiMonitor:${media.author}:play_num:${media.aid}`,"play_num",(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    this.storaging.errStoraging('cctv',`${option.url}`,task.id,`cctv视频${media.aid}播放量减少${result}(纪录)/${media.play_num}(本次)`,"playNumErr","info")
                    return
                }
            })
            // logger.debug("btime media==============",media)
            this.storaging.sendDb(media)
            callback() 
        })
    }
}
module.exports = dealWith