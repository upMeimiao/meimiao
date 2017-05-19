const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require( '../../lib/request' )
const spiderUtils = require('../../lib/spiderUtils')

let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('baijiaDealWith instantiation ...')
    }
    baijia ( task, callback ) {
        task.total = 0
        task.isEnd = false
        this.getVidList( task, ( err ) => {
            if(err){
                return callback( err )
            }
            callback( null, task.total )
        })
    }
    getFan( task, vid ){
        let option = {
            url : 'https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22'+vid+'%22%7D'
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("baijia",option.url,"fan")
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
                this.storaging.errStoraging("baijia",option.url,task.id,err.code || "error",errType,"fan")
                return this.getFan( task, vid )
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baijia',option.url,task.id,"百家号获取fan接口状态码错误","statusErr","fan")
                return this.getFan( task, vid )
            }
            let $ = cheerio.load(result.body)
            if($('div.item p').eq(0).text() == '视频已失效，请观看其他视频'){
                return
            }
            result = result.body.replace(/[\s\n\r]/g,'')
            let startIndex = result.indexOf('videoData={"id'),
                endIndex = result.indexOf(';window.listInitData'),
                dataJson = result.substring(startIndex+10,endIndex)
            try{
                dataJson = JSON.parse(dataJson)
            }catch(e){
                this.storaging.errStoraging('baijia',option.url,task.id,"百家号获取fan接口json数据解析错误","doWithResErr","fan")
                index++
                return
            }
            if(!dataJson || dataJson && !dataJson.app.fans_cnt && dataJson.app.fans_cnt !== 0){
                this.storaging.errStoraging('baijia',option.url,task.id,"百家号获取fan接口返回数据错误","resultErr","fan")
                return
            }
            let user = {
                bid: task.id,
                platform: task.p,
                fans_num: dataJson.app.fans_cnt
            }
            task.isEnd = true
        })
    }
    getVidList( task, callback ){
        let option = {
            referer: 'http://baijiahao.baidu.com/u?app_id='+task.id+'&fr=bjhvideo',
            ua: 1
        },
            cycle = true,
            skip  = 0
        async.whilst(
            () => {
                return cycle
            },
            (cb) => {
                option.url = api.baijia.videoList + task.id + `&_limit=50&_skip=${skip}`
                request.get(logger, option, (err, result) => {
                    this.storaging.totalStorage ("baijia",option.url,"vidlist")
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
                        this.storaging.errStoraging("baijia",option.url,task.id,err.code || "error",errType,"vidlist")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('baijia',option.url,task.id,"百家号获取vidlist接口状态码错误","statusErr","vidlist")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        this.storaging.errStoraging('baijia',option.url,task.id,"百家号获取vidlist接口json数据解析错误","doWithResErr","vidlist")
                        return cb()
                    }
                    if(!result.items){
                        cycle = false
                        return cb()
                    }
                    this.deal(task, result.items, () => {
                        skip += 50
                        if(skip > 10000){
                            cycle = false
                            return cb()
                        }
                        cb()
                    })
                })
            },
            (err, result) => {
                callback()
            }
        )
    }
    deal( task, user, callback ){
        let index = 0,
            length = user.length
        async.whilst(
            () => {
                return index < length
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
        if(video.type != 'video'){
            return callback()
        }
        async.parallel([
            (cb) => {
                if(video.feed_id == ''){
                    this.getVideoInfo( task, null, video.url, (err, result) => {
                        cb(null,result)
                    })
                }else{
                    if(!task.isEnd){
                        this.getFan( task, video.feed_id )
                    }
                    this.getVideoInfo( task, video.feed_id, null, (err, result) => {
                        cb(null,result)
                    })
                }
            }
        ],(err,result) => {
            if(!result[0]){
                return callback()
            }
            let time  = new Date(video.publish_at),
                media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.id,
                title: spiderUtils.stringHandling(video.title,100),
                desc: spiderUtils.stringHandling(video.abstract,100),
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
            if(!media.play_num){
                return callback()
            }
            // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
            //     if(err){
            //         logger.debug("读取redis出错")
            //         return callback()
            //     }
            //     if(result > media.play_num){
            //         this.storaging.errStoraging('baijia',"",task.id,`百家号播放量减少`,"playNumErr","info",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"info"*/)
            // })
            this.storaging.playNumStorage(media,"info")
            task.total++
            callback()
            
        })
    }
    getVideoInfo( task, vid, url,callback ){
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
                this.storaging.errStoraging("baijia",option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baijia',option.url,task.id,`百家号获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(result.statusCode)
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
                this.storaging.errStoraging('baijia',option.url,task.id,`百家号获取info接口json数据解析错误`,"doWithResErr","info")
                return callback(null,{long_t:'',a_create_time:'',playNum:''})
            }
            let time = dataJson.video ? dataJson.video.time_length : 'json' + dataJson.article.content
            let res = {
                long_t: this.getVidTime(time),
                playNum: dataJson.video ? dataJson.video.playcnt : dataJson.article.read_amount
            } 
            if(!res.playNum && res.playNum !== 0){
                this.storaging.errStoraging('baijia',option.url,task.id,`百家号获取info接口返回数据错误`,"resultErr","info")
                return
            }
            callback(null,res)
        })
    }
    getVidTime( time ){
        let json = time.substring(0,4)
        if(json == 'json'){
            time = time.replace(/json\[/,'').replace(/\]/g,'')
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