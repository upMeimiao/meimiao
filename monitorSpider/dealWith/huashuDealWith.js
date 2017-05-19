const async = require( 'async' )
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
        logger.trace('huashuDealWith instantiation ...')
    }
    huashu ( task, callback ) {
        task.total = 0
        this.getVidList( task, ( err,result ) => {
            if(err){
                return callback( err )
            }
            callback( null, result )
        })
    }
    getVidList( task, callback ){
        let option   = {
            url : api.huashu.videoList + task.id
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("huashu",option.url,"VidList")
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
                this.storaging.errStoraging('huashu',option.url,task.id,err.code || "error",errType,"VidList")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('huashu',option.url,task.id,`华数TV获取VidList接口状态码错误${result.statusCode}`,"statusErr","VidList")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('huashu',option.url,task.id,"华数TV获取VidList接口json数据解析失败","doWithResErr","VidList")
                return callback(e)
            }
            let vidInfo     = result[1].aggData[0].aggRel,
                contents    = result[1].aggData[0].aggChild.data[0].tele_data,
                length      = contents.length
                task.listid = vidInfo.video_sid
            task.total      = length
            if(contents[0].vuid != null){
                this.getVideoList(task,callback)
            }else{
                this.deal(task,vidInfo,contents,length,() => {
                    callback(null)
                })
            }
        })
    }
    getVideoList( task, callback ){
        let option   = {
                url: api.huashu.videoList2 + task.listid
            }
        //logger.debug(option.url)
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("huashu",option.url,"VideoList")
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
                this.storaging.errStoraging('huashu',option.url,task.id,err.code || "error",errType,"VideoList")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('huashu',option.url,task.id,`华数TV获取VideoList接口状态码错误${result.statusCode}`,"statusErr","VideoList")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('huashu',option.url,task.id,"华数TV获取VideoList接口json数据解析失败","doWithResErr","VideoList")
                return callback(e)
            }
            let contents   = result.dramadatas,
                length     = contents.length
            task.type      = 'list2'
            this.deal(task,result,contents,length,() => {
                callback(null)
            })
        })
    }
    deal( task, vidInfo, video, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getMedia( task, vidInfo, video[index], () => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getMedia( task, vidInfo, video, callback ){
        async.series(
            [
                (cb) => {
                    if(task.type == 'list2'){
                        this.getVidInfo( task,video.episodeid, (err,result) => {
                            cb(err,result)
                        })
                    }else{
                        this.getVidInfo( task,video.assetid, (err,result) => {
                            cb(err,result)
                        })
                    }
                },
                (cb) => {
                    this.getComment(task,vidInfo.video_sid,(err,result) => {
                        cb(err,result)
                    })
                },
                (cb) => {
                    if(task.type == 'list2'){
                        this.getPlay( task,video.episodeid, (err,result) => {
                            cb(err,result)
                        })
                    }else{
                        this.getPlay( task,video.assetid, (err,result) => {
                            cb(err,result)
                        })
                    }
                }
            ],
            (err,result) => {
                if(err){
                    logger.debug("err",err)
                    return callback()
                }
                let media
                if(task.type == 'list2'){
                    media = {
                        author: task.name,
                        platform: task.p,
                        bid: task.id,
                        aid: video.episodeid,
                        title: video.episode_name.replace(/"/g,''),
                        v_img: video.episode_pic,
                        v_url: result[0].wap_url,
                        desc: vidInfo.abstract.substring(0,100).replace(/"/g,''),
                        class: vidInfo.class,
                        long_t: result[0].duration,
                        a_create_time: result[0].updatetime,
                        play_num: result[2],
                        comment_num: result[1]
                    }
                }else{
                    media = {
                        author: task.name,
                        platform: task.p,
                        bid: task.id,
                        aid: video.assetid,
                        title: video.abs.replace(/"/g,''),
                        v_img: video.img,
                        v_url: video.url,
                        desc: vidInfo.video_abstract.substring(0,100).replace(/"/g,''),
                        class: result[0].class,
                        long_t: result[0].duration,
                        a_create_time: result[0].updatetime,
                        play_num: result[2],
                        comment_num: result[1]
                    }
                }
                
                if(!media.play_num){
                    logger.debug("media.play_num",media.play_num)
                    return callback()
                }
                //logger.debug(media.title + '---' + media.play_num)
                // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
                //     if(err){
                //         logger.debug("读取redis出错")
                //         return callback()
                //     }
                //     if(result > media.play_num){
                //         this.storaging.errStoraging('huashu',"",task.id,`华数TV视频播放量减少`,"playNumErr","play",media.aid,`${result}/${media.play_num}`)
                //     }
                //     this.storaging.sendDb(media/*,task.id,"play"*/)
                // })
                this.storaging.playNumStorage(media,"play")
                callback()
            }
        )
    }
    getVidInfo( task, vid, callback ){
        let option = {
            url : 'http://clientapi.wasu.cn/Phone/vodinfo/id/'+vid
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("huashu",option.url,"info")
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
                this.storaging.errStoraging('huashu',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('huashu',option.url,task.id,`华数TV获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('huashu',option.url,task.id,"华数TV获取VideoList接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            callback(null,result)
        })
    }
    getComment( task, vid, callback ){
        let option = {
            url : 'http://changyan.sohu.com/api/3/topic/liteload?client_id=cyrHNCs04&topic_category_id=37&page_size=10&hot_size=5&topic_source_id='+vid+'&_='+ new Date().getTime()
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("huashu",option.url,"comment")
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
                this.storaging.errStoraging('huashu',option.url,task.id,err.code || "error",errType,"comment")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('huashu',option.url,task.id,`华数TV获取comment接口状态码错误${result.statusCode}`,"statusErr","comment")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('huashu',option.url,task.id,"华数TV获取comment接口json数据解析失败","doWithResErr","comment")
                return callback(e)
            }
            if(!result.cmt_sum && result.cmt_sum !== 0){
                this.storaging.errStoraging('huashu',option.url,task.id,"华数TV获取comment接口返回数据错误","resultErr","comment")
                return callback(result)
            }
            callback(null,result.cmt_sum)
        })
    }
    getPlay( task, vid, callback ){
        let option = {
            url: `http://pro.wasu.cn/index/vod/updateViewHit/id/${vid}/pid/37/dramaId/${vid}?${new Date().getTime()}&jsoncallback=jsonp`
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("huashu",option.url,"play")
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
                this.storaging.errStoraging("huashu",option.url,task.id,err.code || "error",errType,"play")
                return this.getPlay( task, vid, callback )            
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('huashu',option.url,task.id,"华数TV获取play接口状态码错误","statusErr","play")
                return this.getPlay( task, vid, callback )
            }
            try{
                result = eval(result.body)
            }catch (e){
                this.storaging.errStoraging('huashu',option.url,task.id,"华数TV获取play接口eval错误","doWithResErr","play")
                return this.getPlay( vid, callback )
            }
            result = result ? Number(result.replace(/,/g,'')) : ''
            if(!result){
                return
            }
            // logger.debug("huashu media==============",media)
            callback(null,result)
        })
    }
}
module.exports = dealWith