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
        logger.trace('pptvDealWith instantiation ...')
    }
    pptv ( task, callback ) {
        task.total = 0
        this.getVidList( task, ( err,result ) => {
            if(err){
                return callback( err,result )
            }
            callback( err,result )
        })
    }

    getVidList( task, callback ){
        let option = {
            url : api.pptv.listVideo+"&pid="+task.id+"&cat_id="+task.encodeId
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("pptv",option.url,"list")
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
                this.storaging.errStoraging('pptv',option.url,task.id,err.code || "error",errType,"list")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('pptv',option.url,task.id,`pptv获取user接口状态码错误${result.statusCode}`,"statusErr","list")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('pptv',option.url,task.id,"pptv获取list接口json数据解析失败","doWithResErr","list")
                return callback(e.message)
            }
            let length = result.data.list.length
            task.total = result.data.total
            this.deal(task,result.data,length,() => {
                callback()
            })
        })
    }
    deal( task, user, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getAllInfo( task, user.list[index], () => {
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
        async.parallel([
            (cb) => {
                this.getVideoInfo(task,video.url,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getTotal(task,video.id,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            }
        ],(err,result) => {
            if(err){
                return callback()
            }
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.id,
                title: video.title.replace(/"/g,''),
                comment_num: result[1],
                class: result[0].class,
                tag: result[0].tag,
                desc: result[0].desc.replace(/"[\s\n\r]/g,''),
                long_t: result[0].data.duration,
                v_img: video.capture,
                v_url: video.url,
                play_num: video.pv.replace('万','0000')
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
            //         this.storaging.errStoraging('pptv',"",task.id,`pptv视频播放量减少`,"playNumErr","list",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"list"*/)
            // })
            this.storaging.playNumStorage(media,"list")
            callback()
        })
    }
    getVideoInfo( task, url, callback ){
        let vid    = url.match(/show\/\w*\.html/).toString().replace(/show\//,''),
            option = {
                url: url,
                referer: 'http://v.pptv.com/page/'+vid,
                ua: 1
            }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("pptv",option.url,"info")
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
                //logger.error(errType)
                this.storaging.errStoraging("pptv",option.url,task.id,err.code || "error",errType,"info")
                setTimeout(() => {
                    this.getVideoInfo( task, url, callback )
                },100)
                return
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('pptv',option.url,task.id,"pptv获取info接口状态码错误","statusErr","info")
                return callback()
            }
            let $ = cheerio.load(result.body),
                script = $('script')[2].children[0].data,
                data = script.replace(/[\s\n]/g,'').replace(/varwebcfg=/,'').replace(/;/,''),
                tags = '',
                tag = $('div#video-info .bd .tabs a'),
                desc = $('div#video-info .bd ul>li').eq(2).find('span,a').empty()
            desc = $('div#video-info .bd ul>li').eq(2).text()
            for(let i=0;i<tag.length;i++){
                tags += tag.eq(i).text()+","
            }
            try{
                data = JSON.parse(data)
            } catch(e){
                this.storaging.errStoraging('pptv',option.url,task.id,"pptv获取info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            let res = {
                data: data,
                class: $('div#video-info .bd .crumbs a').text(),
                tag: tags,
                desc: desc
            }
            callback(null,res)
        })
    }
    getTotal( task, id, callback ){
        let option = {
            url : 'http://apicdn.sc.pptv.com/sc/v3/pplive/ref/vod_'+id+'/feed/list?appplt=web&action=1&pn=0&ps=20'
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("pptv",option.url,"total")
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
                this.storaging.errStoraging('pptv',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('pptv',option.url,task.id,`pptv获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse( result.body )
            } catch (e) {
                this.storaging.errStoraging('pptv',option.url,task.id,"pptv获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            callback(null,result.data.total)
        })
    }
}
module.exports = dealWith