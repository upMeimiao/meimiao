/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
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
        logger.trace('DealWith instantiation ...')
    }
    xinlan ( task, callback ) {
        task.total = 0
        this.getVidList( task, ( err,result ) => {
            if(err){
                return callback( err )
            }
            callback( null, result )
        })
    }

    getVidList( task, callback ){
        
        let option = {
            url : api.xinlan.listVideo + task.id + "&cid=" + task.encodeId + '&_=' + new Date().getTime(),
            ua : 1
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("xinlan",option.url,"list")
            if (err) {
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"list")
                return this.getVidList( task, callback )
            }
            if(!result){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取list接口无返回数据","responseErr","list")
                return this.getVidList( task, callback )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取list接口json数据解析失败","doWithResErr","list")
                return this.getVidList( task, callback )
            }
            if(!result.data || !result.data.length){
                return this.getVidList( task, callback )
            }
            let length = result.data.length
            task.total = length
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
        async.parallel([
            (cb) => {
                this.getVideoInfo(task,video.vid,num,(err,result) => {
                    logger.debug(err,result)
                })
            },
            (cb) => {
                this.getComment(task,(err,result) => {
                    logger.debug(err,result)
                })
            },
            (cb) => {
                this.getSupport( task, video.vid, (err, result) => {
                    logger.debug(err,result)
                })
            },
            (cb) => {
                this.getSava( task, video.vid, (err, result) => {
                    logger.debug(err,result)
                })
            }
        ],(err,result) => {
            if(result[0] == 'next'){
                return callback()
            }
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.vid,
                title: video.title.replace(/"/g,''),
                desc: result[0].videoBrief.replace(/"/g,''),
                class: result[0].videoTypesDesc,
                long_t: video.durationApp,
                v_img: video.pic,
                v_url: video.url,
                comment_num: result[1].total,
                support: result[2].supportNumber,
                save_num: result[3].hasCollect
            }
            
            callback()
        })
    }
    getSava( task, vid, callback ){
        let option = {
            url: 'http://proxy.app.cztv.com/getCollectStatus.do?videoIdList='+vid,
            authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("xinlan",option.url,"save")
            if(err){
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"save")
                return callback(null,{hasCollect:''})
            }
            if(!result){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取save接口无返回数据","resultErr","save")
                return callback()
            }
            if(!result.body){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取save接口无返回数据","resultErr","save")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取save接口json数据解析失败","doWithResErr","save")
                logger.info(result)
                return callback(null,{hasCollect:''})
            }
            if(!result.content){
                return
            }
            let media = {
                "author": "xinlan",
                "aid": vid,
                "play_num": result.content.list[0].hasCollect
            }
            // logger.debug("xinlan +++++++++++++++++++++++++++++++++++++++++++result result.content.list",result,result.content.list)
            this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${vid}`,(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    this.storaging.errStoraging('xinlan',`${option.url}`,task.id,`mgtv视频${vid}保存量减少`,"playNumErr","save")
                    return
                }
            })
            // logger.debug("xinlan media==============",media)
            this.storaging.sendDb(media)
            if(!result.content){
                return
            }
            callback(null,result.content.list[0])
        })
    }
    getSupport( task, vid, callback ){
        let option = {
            url: 'http://proxy.app.cztv.com/getSupportStatus.do?videoIdList='+vid,
            authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
        }
        //logger.debug(option.url)
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("xinlan",option.url,"suport")
            if(err){
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"suport")
                return callback(null,{supportNumber:''})
            }
            if(!result || (result && !result.body)){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取suport接口无返回数据","resultErr","suport")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('点赞量解析失败')
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取suport接口json数据解析失败","doWithResErr","suport")
                return callback(null,{supportNumber:''})
            }
            if(result.content == undefined){
                return this.getSupport( task, vid, callback )
            }
            callback(null,result.content.list[0])
        })
    }
    getComment( task, callback ){
        let option = {
            url:'http://api.my.cztv.com/api/list?xid='+task.id+'&pid=6&type=video&page=1&rows=10&_='+ new Date().getTime(),
            authtoken:'103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("xinlan",option.url,"comment")
            if(err){
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"comment")
                callback(null,{comment_count:''})
            }
            if(!result){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取comment接口无返回数据","resultErr","comment")
                return callback()
            }
            if(!result.body){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取comment接口无返回数据","resultErr","comment")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取comment接口json数据解析失败","doWithResErr","comment")
                return callback(null,{comment_count:''})
            }
            callback(null,result)
        })
    }
    getVideoInfo( task, vid, num, callback ){
        let option = {
            url: api.xinlan.videoInfo+vid,
            authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("xinlan",option.url,"info")
            if(err){
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"info")
                if(num <= 1){
                    return this.getVideoInfo( task, vid, num++, callback )
                }
                return callback(null,'next')
            }
            if(!result){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取info接口无返回数据","resultErr","info")
                return callback()
            }
            if(!result.body){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取info接口无返回数据","resultErr","info")
                return callback()
            }
            num = 0
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('xinlan',option.url,task.id,"xinlan获取info接口json数据解析失败","doWithResErr","info")
                if(num <= 1){
                    return this.getVideoInfo( task, vid, num++, callback )
                }
                return callback(null,'next')
            }
            callback(null,result.content.list[0])
        })
    }
}
module.exports = dealWith