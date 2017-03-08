/**
 * Created by junhao on 16/6/21.
 */
const async = require( 'async' )
const request = require('../lib/request.js')
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
            this.storaging.judgeRes ("huashu",option.url,task.id,err,result,"VidList")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('huashu',option.url,task.id,"huashu获取VidList接口json数据解析失败","doWithResErr","VidList")
                return callback(e)
            }
            let vidInfo     = result[1].aggData[0].aggRel,
                contents    = result[1].aggData[0].aggChild.data[0].tele_data,
                length      = contents.length
                task.listid = vidInfo.video_sid
            task.total     = length
            if(contents[0].vuid != null){
                this.getVideoList(task,callback)
            }else{
                this.deal(task,vidInfo,contents,length,() => {
                    logger.debug('当前用户数据请求完毕')
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
            this.storaging.judgeRes ("huashu",option.url,task.id,err,result,"VideoList")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('huashu',option.url,task.id,"huashu获取VideoList接口json数据解析失败","doWithResErr","VideoList")
                return callback(e)
            }
            let contents   = result.dramadatas,
                length     = contents.length
            task.type      = 'list2'
            this.deal(task,result,contents,length,() => {
                logger.debug('当前用户数据请求完毕')
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
                //logger.debug(media.title + '---' + media.play_num)
                
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
            this.storaging.judgeRes ("huashu",option.url,task.id,err,result,"info")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('huashu',option.url,task.id,"huashu获取VideoList接口json数据解析失败","doWithResErr","info")
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
            this.storaging.judgeRes ("huashu",option.url,task.id,err,result,"comment")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('huashu',option.url,task.id,"huashu获取comment接口json数据解析失败","doWithResErr","comment")
                return callback(e)
            }
            callback(null,result.cmt_sum)
        })
    }
    getPlay( task, vid, callback ){
        let option = {
            url: `http://uc.wasu.cn/Ajax/updateViewHit/id/${vid}/pid/37/dramaId/${vid}?${new Date().getTime()}`
        }
        request.get( logger, option, (err, result) => {
            if(err){
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("huashu",option.url,task.id,err.code || err,errType,"play")
                return this.getPlay( task, vid, callback )            
            }
            if(!result){
                this.storaging.errStoraging("huashu",option.url,task.id,"huashu play接口无返回数据","resultErr","play")
                return this.getPlay( task, vid, callback )  
            }
            result = result.body ? Number(result.body.replace(/,/g,'')) : ''
            let media = {
                    "author": "huashu",
                    "aid": vid,
                    "play_num": result
                }
                this.core.MSDB.hget(`apiMonitor:${media.author}:play_num:${media.aid}`,"play_num",(err,result)=>{
                    if(err){
                        logger.debug("读取redis出错")
                        return
                    }
                    if(result > media.play_num){
                        this.storaging.errStoraging('huashu',`${option.url}`,task.id,`huashu视频${media.aid}播放量减少`,"playNumErr","play")
                        return
                    }
                })
                // logger.debug("huashu media==============",media)
                this.storaging.sendDb(media)
            callback(null,result)
        })
    }
}
module.exports = dealWith