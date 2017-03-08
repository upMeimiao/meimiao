const async = require('async')
const moment = require('moment')
const request = require('../spider/lib/request.js')

let logger,api
class dealWith {
    constructor(spiderCore) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('ifengDealWith instantiation ...')
    }
    ifeng( task, callback) {
        task.total = 0
        this.getTotal(task, (err,result) => {
            if(err){
                return callback(err)
            }
            callback(err,result)
        })
    }
    getTotal(task, callback){
        let option = {
            url: api.ifeng.medialist + task.id + '&pageNo=1',
            ua: 3,
            own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
        }
        request.get(logger, option, (err,result) => {
            this.storaging.totalStorage ("ifeng",option.url,"total")
            this.storaging.judgeRes ("ifeng",option.url,task.id,err,result,"total")
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
                this.storaging.errStoraging('ifeng',option.url,task.id,"ifeng获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            if(result.infoList.length == 0){
                this.storaging.errStoraging('ifeng',option.url,task.id,"ifeng获取total接口异常错误","resultErr","total")
                return callback('异常错误')
            }
            task.total = result.infoList[0].weMedia.totalNum
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: result.infoList[0].weMedia.followNo
            }
            this.getList(task, result.infoList[0].weMedia.totalPage, (err,result) => {
                if(err){
                    return callback(err)
                }
                callback(err,result)
            })
        })
    }
    getList(task, page, callback){
        let index = 1,option = {
            ua: 3,
            own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
        }
        async.whilst(
            () => {
                return index <= Math.min(page,500)
            },
            (cb) => {
                option.url = api.ifeng.medialist + task.id + '&pageNo=' + index
                request.get(logger, option, (err,result) => {
                    this.storaging.totalStorage ("ifeng",option.url,"list")
                    if(err){
                        let errType
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                            errType = "timeoutErr"
                        } else{
                            errType = "responseErr"
                        }
                        //logger.error(errType)
                        this.storaging.errStoraging("ifeng",option.url,task.id,err.code || err,errType,"list")
                        return cb()
                    }
                    if(!result){
                        this.storaging.errStoraging('ifeng',option.url,task.id,"ifeng获取list接口无返回结果","resultErr","list")
                        return  cb()
                    }
                    if(!result.body){
                        this.storaging.errStoraging('ifeng',option.url,task.id,"ifeng获取list接口返回数据为空","resultErr","list")
                        return  cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('ifeng',option.url,task.id,"ifeng获取list接口json数据解析失败","doWithResErr","list")
                        index++
                        return cb()
                    }
                    if(result.infoList.length <=0 ){
                        index++
                        return cb()
                    }
                    let list =result.infoList[0].bodyList
                    this.deal(task,list,() => {
                        index++
                        cb()
                    })
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal(task ,list ,callback ) {
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.getVideo(task,list[index],(err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getVideo(task, video, callback){
        let option = {
            url: api.ifeng.info + video.memberItem.guid,
            ua: 3,
            own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
        },media
        request.get(logger, option, (err, result) => {
            this.storaging.totalStorage ("ifeng",option.url,"video")
            if(err){
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("ifeng",option.url,task.id,err.code || err,errType,"video")
                return callback(err)
            }
            if(!result){
                this.storaging.errStoraging("ifeng",option.url,task.id,"ifeng video接口无返回数据","resultErr","video")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('ifeng',option.url,task.id,"ifeng获取video接口json数据解析失败","doWithResErr","video")
                return callback(err)
            }
            media = {
                author: task.name,
                platform: task.platform,
                bid: task.id,
                aid: result.itemId,
                title: result.title ? result.title.substr(0,100).replace(/"/g,'') : 'btwk_caihongip',
                desc: result.abstractDesc ? result.abstractDesc.substr(0,100).replace(/"/g,'') : (result.name ? result.name.substr(0,100).replace(/"/g,'') : ''),
                play_num: result.playTime,
                comment_num: result.commentNo,
                a_create_time: moment(result.createDate).format('X'),
                v_img: result.image,
                long_t: result.duration,
                tag: video.tag,
                v_url: video.memberItem.pcUrl
            }
            this.core.MSDB.hget(`apiMonitor:${media.author}:play_num:${media.aid}`,"play_num",(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    this.storaging.errStoraging('acfun',`${option.url}`,task.id,`ifeng视频${media.aid}播放量减少`,"playNumErr","video")
                    return
                }
            })
            logger.debug("ifeng media==============",media)
            this.storaging.sendDb(media)
            callback()
        })
    }
}
module.exports = dealWith