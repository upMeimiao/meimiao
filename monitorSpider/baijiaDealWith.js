/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require('../lib/request.js')
const _Callback = function(data){
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
        logger.trace('baijiaDealWith instantiation ...')
    }
    baijia ( task, callback ) {
        task.total = 0
        this.getVidTotal( task, ( err,result ) => {
            if(err){
                return callback( err )
            }
            callback( err,result )
        })
    }

    getVidTotal( task, callback ){
        let option = {
            url: api.baijia.videoList + task.id + "&_limit=200",
            referer: 'http://baijiahao.baidu.com/u?app_id='+task.id+'&fr=bjhvideo',
            ua: 1
        }
        //logger.debug(option)
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("baijia",option.url,"total")
            if (err) {
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("baijia",option.url,task.id,err.code || "error",errType,"total")
                return this.getVidTotal( task, callback )
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baijia',option.url,task.id,"baijia获取total接口状态码错误","statusErr","total")
                return this.getVidTotal( task, callback )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('baijia',option.url,task.id,"baijia获取total接口json数据解析失败","doWithResErr","total")
                return this.getVidTotal( task, callback )
            }
            let total = result.total
            //logger.debug(total)
            async.parallel(
                [
                    (cb) => {
                        this.getFan(task,result.items,() => {
                            cb(null,null)
                        })
                    },
                    (cb) => {
                        this.getVidList(task,total,() => {
                            cb(null,null)
                        })
                    }
                ],
                (err,result) => {
                    callback()
                }
            )
                
                
        })
    }
    getFan( task, data, callback ){
        let arr = [],index = 0
        const Fan = ( vid ) => {
            if(vid == null){
                return callback()
            }
            let option = {
                url : 'https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22'+vid[index]+'%22%7D'
            }
            request.get( logger, option, (err, result) => {
                this.storaging.totalStorage ("baijia",option.url,"fan")
                if(err){
                    let errType
                    if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                    //logger.error(errType)
                    this.storaging.errStoraging("baijia",option.url,task.id,err.code || "error",errType,"fan")
                    return Fan( vid )
                }
                if(result.statusCode && result.statusCode != 200){
                    this.storaging.errStoraging('baijia',option.url,task.id,"baijia获取fan接口状态码错误","statusErr","fan")
                    return Fan( vid )
                }
                let $ = cheerio.load(result.body)
                if($('div.item p').eq(0).text() == '视频已失效，请观看其他视频'){
                    index++
                    return Fan( vid )
                }
                let script = $('script')[11].children[0] == undefined ? $('script')[12].children[0].data.replace(/[\s\n\r]/g,'') : $('script')[11].children[0].data.replace(/[\s\n\r]/g,''),
                    startIndex = script.indexOf('videoData={"id'),
                    endIndex = script.indexOf(';window.listInitData'),
                    dataJson = script.substring(startIndex+10,endIndex)
                try{
                    dataJson = JSON.parse(dataJson)
                }catch(e){
                    this.storaging.errStoraging('baijia',option.url,task.id,"baijia获取fan接口json数据解析失败","doWithResErr","fan")
                    index++
                    return Fan( vid )
                }
                let user = {
                    bid: task.id,
                    platform: task.p,
                    fans_num: dataJson.app.fans_cnt
                }
                callback()
            })
        }
        for (let i = 0; i < data.length; i++) {
            if(data[i].type == 'video' && data[i].feed_id != ''){
                arr.push(data[i].feed_id)
                if(arr.length >= 2){
                    Fan(arr)
                    return
                }
            }
        }
        Fan(null)
    }
    getVidList( task, total, callback ){
        let option = {
            url: api.baijia.videoList + task.id + "&_limit=" + total,
            referer: 'http://baijiahao.baidu.com/u?app_id='+task.id+'&fr=bjhvideo',
            ua: 1
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("baijia",option.url,"list")
            if (err) {
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("baijia",option.url,task.id,err.code || "error",errType,"list")
                return this.getVidList( task, total, callback )
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baijia',option.url,task.id,"baijia获取list接口状态码错误","statusErr","list")
                return this.getVidList( task, total, callback )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据总量解析失败')
                this.storaging.errStoraging('baijia',option.url,task.id,"baijia获取list接口json数据解析失败","doWithResErr","list")
                return this.getVidList( task, total, callback )
            }

            this.deal(task,result.items,total,() => {
                callback()
            })
        })
    }
    deal( task, user, total, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < total
            },
            (cb) => {
                this.getAllInfo( task, user[index], () => {
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
        let num = 0
        if(video.type != 'video'){
            return callback()
        }
        async.parallel([
            (cb) => {
                if(video.feed_id == ''){
                    this.getVideoInfo( task, null, video.url, num, (err, result) => {
                        cb(null,result)
                    })
                }else{
                    this.getVideoInfo( task, video.feed_id, null, num, (err, result) => {
                        cb(null,result)
                    })
                }
            }
        ],(err,result) => {
            let time  = new Date(video.publish_at),
                media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.id,
                title: video.title.substring(0,100).replace(/"/g,''),
                desc: video.abstract.substring(0,100).replace(/"/g,''),
                class: video.domain,
                tag: video.tag,
                long_t: result[0].long_t,
                v_img: JSON.parse(video.cover_images)[0].src,
                v_url: video.url,
                comment_num: video.comment_amount,
                forward_num: video.push_amount,
                a_create_time: moment(time).format('X'),
                play_num: result[0].playNum
            }
            if(!media.play_num && media.play_num !== 0){
                return callback()
            }
            task.total++
            // logger.debug(media.title+'---'+task.total)
            callback()
            
        })
    }
    getVideoInfo( task, vid, url, num, callback ){
        let option = {}
        if(vid != null){
            option.url = 'https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22'+vid+'%22%7D'
        }else{
            option.url = url
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("baijia",option.url,"info")
            if(err){
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("baijia",option.url,task.id,err.code || "error",errType,"info")
                if(num <= 1){
                    return this.getVideoInfo( task, vid, url, num++, callback )
                }
                return callback(null,{long_t:'',a_create_time:'',playNum:''})
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baijia',option.url,task.id,"baijia获取list接口状态码错误","statusErr","list")
                return callback(null,{long_t:'',a_create_time:'',playNum:''})
            }
            let $ = cheerio.load(result.body)
            
            if($('div.item p').eq(0).text() == '视频已失效，请观看其他视频'){
                return callback(null,{long_t:'',playNum:null})
            }
            let dataJson = result.body.replace(/[\s\n\r]/g,''),
                startIndex = dataJson.indexOf('videoData={"id') == -1 ? dataJson.indexOf('={tplData:{') : dataJson.indexOf('videoData={"id'),
                endIndex = dataJson.indexOf(';window.listInitData') == -1 ? dataJson.indexOf(',userInfo:') : dataJson.indexOf(';window.listInitData')
                dataJson = dataJson.substring(startIndex+10,endIndex)
            try{
                dataJson = JSON.parse(dataJson)
            }catch(e){
                this.storaging.errStoraging('baijia',option.url,task.id,"baijia获取info接口json数据解析失败","doWithResErr","info")
                return callback(null,{long_t:'',a_create_time:'',playNum:''})
            }
            let time = dataJson.video ? dataJson.video.time_length : 'json' + dataJson.article.content
            let res = {
                long_t: this.getVidTime(time),
                playNum: dataJson.video ? dataJson.video.playcnt : dataJson.article.read_amount
            } 
            if(!vid){
                return
            }
            let media = {
                "author": "baijia",
                "aid": vid,
                "play_num": res.playNum
            }
            // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
            //     if(err){
            //         logger.debug("读取redis出错")
            //         return
            //     }
            //     if(result > media.play_num){
            //         this.storaging.errStoraging('baijia',`${option.url}`,task.id,`baijia视频${media.aid}播放量减少`,"playNumErr","info")
            //         return
            //     }
            // })
            // logger.debug("baijia media==============",media)
            this.storaging.sendDb(media,task.id,"info")
            callback(null,res)
        })
    }
    getVidTime( time ){
        let json = time.substring(0,4)
        if(json == 'json'){
            time = time.replace(/json\[/,'').replace(/\]/,'')
            try{
                time = JSON.parse(time)
            }catch(e){
                logger.debug('视频时长解析失败')
                logger.info(time)
            }
            return time.long
        }
        let timeArr = time.split(':'),
            long_t  = '';
        if(timeArr.length == 2){
            long_t = parseInt(timeArr[0]*60) + parseInt(timeArr[1])
        }else if(timeArr.length == 3){
            long_t = parseInt((timeArr[0]*60)*60) + parseInt(timeArr[1]*60) + parseInt(timeArr[2])
        }
        return long_t;
    }
}
module.exports = dealWith