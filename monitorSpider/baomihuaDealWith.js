/**
 * Created by junhao on 16/7/28.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../lib/request' )
const jsonp = function (data) {
    return data
}
let logger,api

class dealWith {
    constructor( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('baomihuaDealWith instantiation ...')
    }
    baomihua ( task, callback ) {
        task.total = 0
        async.parallel(
            {
                user: (cb) => {
                    this.getUser(task,(err,result)=>{
                        cb(err,result)
                    })
                },
                media: (cb) => {
                    this.getList(task,(err,result) => {
                        if(err){
                            return cb(err,result)
                        }
                        cb(err,result)
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
    getUser ( task, callback ) {
        let option = {
            url: api.baomihua.userInfo + task.id
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("baomihua",option.url,"user")
            this.storaging.judgeRes ("baomihua",option.url,task.id,err,result,"user")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('iqiyi',option.url,task.id,"爆米花获取user接口json数据解析失败","doWithResErr","user")
                // logger.info(result)
                return callback(e)
            }
            result = result.result
            // let user = {
            //     platform: 13,
            //     bid: task.id,
            //     fans_num: result.ChannelInfo.RssNum
            // }
        })
    }
    getList ( task, callback ) {
        let option = {}, sign = true, minid
        async.whilst(
            () => {
                return sign
            },
            (cb) => {
                if(minid){
                    option.url = api.baomihua.mediaList + task.id + `&minid=${minid}`
                }else{
                    option.url = api.baomihua.mediaList + task.id
                }
                request.get( logger,option, ( err, result ) => {
                    if(err){
                        // logger.error(err,err.code,err.Error)
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
                        // logger.error(errType)
                        this.storaging.errStoraging('baomihua',option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('baomihua',option.url,task.id,"baomihua获取list接口状态码错误","statusErr","list")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('baomihua',option.url,task.id,"爆米花获取视频列表接口json数据解析失败","doWithResErr","list")
                        return cb()
                    }
                    result = result.result
                    if(!result.VideoList || result.VideoList == 'null'){
                        // logger.debug('已经没有数据')
                        sign = false
                        return cb()
                    }
                    task.total = result.allCount
                    let list = result.VideoList,
                        length = list.length
                    minid = list[length-1].RECORID
                    this.deal(task,list,()=>{
                        cb()
                    })
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, list, callback ) {
        let index = 0,
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            ( cb ) => {
                this.info( task, list[index], (err) => {
                    index++
                    cb()
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    info ( task, video, callback ) {
        let id = video.OBJID
        async.parallel([
            ( cb ) => {
                this.getExpr( task, id, ( err, data ) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            ( cb ) => {
                this.getExprPC( task, id, ( err, data ) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            ( cb ) => {
                this.getPlayNum( task, id, ( err, data ) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            }
        ], ( err, result ) => {
            if(err){
                return callback(err)
            }
            let media = {
                author: task.name,
                platform: 13,
                bid: task.id,
                aid: id,
                title: video.OBJTITLE.substr(0,100).replace(/"/g,''),
                desc: video.OBJDESC.substr(0,100).replace(/"/g,''),
                play_num: Number(result[2]),
                comment_num: Number(result[0].reviewCount),
                forward_num: Number(result[0].shareCount),
                support: Number(result[0].zanCount) + Number(result[1].zancount),
                save_num: Number(result[0].collectCount) + Number(result[1].CollectionCount),
                v_img: video.IMGURL
            }
            this.core.MSDB.hget(`apiMonitor:play_num`,"${media.author}_${media.aid}",(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    this.storaging.errStoraging('baomihua',`${api.baomihua.playNum}${task.id}&flvid=${media.aid}`,task.id,`爆米花视频播放量减少`,"playNumErr","playNum",media.aid,`${result}/${media.play_num}`)
                    return
                }
                this.storaging.sendDb(media/*,task.id,"playNum"*/)
            })
            callback()
        })
    }
    getExpr ( task, id, callback ) {
        let option = {
            url: api.baomihua.expr_m + id,
            ua: 3,
            own_ua:'BMHVideo/3.3.3 (iPhone; iOS 10.1.1; Scale/3.00)'
        }
        request.get( logger,option, ( err, result ) => {
            this.storaging.totalStorage ("baomihua",option.url,"Expr")
            this.storaging.judgeRes ("baomihua",option.url,task.id,err,result,"Expr")
            if(!result){
                return
            }
            if(!result.body){
                return
            }
            try{
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('返回JSON格式不正确')
                this.storaging.errStoraging('baomihua',option.url,task.id,"爆米花Expr接口json数据解析失败","doWithResErr","Expr")
                return callback(e)
            }
            callback(null,result.result.item[0])
        })
    }
    getExprPC ( task, id, callback ) {
        let option = {
            url: api.baomihua.expr_pc + id + '&_=' + (new Date()).getTime()
        }
        request.get( logger,option, ( err, result ) => {
            this.storaging.totalStorage ("baomihua",option.url,"ExprPC")
            this.storaging.judgeRes ("baomihua",option.url,task.id,err,result,"ExprPC")
            if(!result){
                return
            }
            if(!result.body){
                return
            }
            try{
                result = eval(result.body)
            } catch (e){
                logger.error('getExpr jsonp error')
                this.storaging.errStoraging('baomihua',option.url,task.id,"爆米花ExprPC接口eval错误","doWithResErr","ExprPC")
                return callback(e)
            }

            if(result.length == 0){
                return callback(null,{zancount:0,CollectionCount:0})
            }
            callback(null,result[0])
        })
    }
    getPlayNum (task, id, callback ) {
        let option = {
            url: api.baomihua.play + `${task.id}&flvid=` + id
        }
        request.get( logger,option, ( err, result ) => {
            this.storaging.totalStorage ("baomihua",option.url,"playNum")
            this.storaging.judgeRes ("baomihua",option.url,task.id,err,result,"playNum")
            if(!result){
                return
            }
            if(!result.body){
                return
            }
            try{
                result = eval(result.body)
            } catch (e){
                logger.error('playNum jsonp error')
                this.storaging.errStoraging('baomihua',option.url,task.id,"爆米花playNum接口eval错误","doWithResErr","playNum")
                return callback(e)
            }
            callback(null,result.appinfo[0].playCount)
        })
    }
}
module.exports = dealWith