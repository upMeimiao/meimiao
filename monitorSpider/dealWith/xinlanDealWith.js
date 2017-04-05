/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require('../../lib/request.js')
const _Callback = function(data){
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
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"list")
                return this.getVidList( task, callback )
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取list接口状态码错误","statusErr","list")
                return this.getVidList( task, callback )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取list接口json数据解析失败","doWithResErr","list")
                return this.getVidList( task, callback )
            }
            if(!result.data){
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
                    cb()
                })
            },
            (cb) => {
                this.getComment(task,(err,result) => {
                    cb()
                })
            },
            (cb) => {
                this.getSupport( task, video.vid, (err, result) => {
                    cb()
                })
            },
            (cb) => {
                this.getSava( task, video.vid, (err, result) => {
                    cb()
                })
            }
        ],(err,result) => {
            if(result[0] == 'next'||!result[0]){
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
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"save")
                return callback(null,{hasCollect:''})
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取save接口状态码错误","statusErr","save")
                return callback()
            }
            if(!result.body){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取save接口无返回数据","resultErr","save")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取save接口json数据解析失败","doWithResErr","save")
                logger.info(result)
                return callback(null,{hasCollect:''})
            }
            if(!result.content){
                return callback()
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
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"suport")
                return callback(null,{supportNumber:''})
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取suport接口状态码错误","statusErr","suport")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('点赞量解析失败')
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取suport接口json数据解析失败","doWithResErr","suport")
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
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"comment")
                return callback(null,{comment_count:''})
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取comment接口状态码错误","statusErr","comment")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取comment接口json数据解析失败","doWithResErr","comment")
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
                this.storaging.errStoraging("xinlan",option.url,task.id,err.code || "error",errType,"info")
                if(num <= 1){
                    return this.getVideoInfo( task, vid, num++, callback )
                }
                return callback(null,'next')
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取info接口状态码错误","statusErr","info")
                return callback()
            }
            if(!result.body){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取info接口无返回数据","resultErr","info")
                return callback()
            }
            num = 0
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('xinlan',option.url,task.id,"新蓝网获取info接口json数据解析失败","doWithResErr","info")
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