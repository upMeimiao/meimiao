const async = require('async')
const moment = require('moment')
const request = require('../../lib/request.js')

let logger,api
class dealWith {
    constructor(spiderCore) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
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
                this.storaging.errStoraging('ifeng',option.url,task.id,err.code || "error",errType,"total")
                return callback()
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('ifeng',option.url,task.id,`凤凰号获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('ifeng',option.url,task.id,"凤凰号获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            if(result.infoList.length == 0){
                this.storaging.errStoraging('ifeng',option.url,task.id,"凤凰号获取total接口异常错误","resultErr","total")
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
                        this.storaging.errStoraging("ifeng",option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('ifeng',option.url,task.id,"凤凰号获取list接口状态码错误","statusErr","list")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        this.storaging.errStoraging('ifeng',option.url,task.id,"凤凰号获取list接口json数据解析失败","doWithResErr","list")
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
                this.storaging.errStoraging("ifeng",option.url,task.id,err.code || "error",errType,"video")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('ifeng',option.url,task.id,"凤凰号获取video接口状态码错误","statusErr","video")
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('ifeng',option.url,task.id,"凤凰号获取video接口json数据解析失败","doWithResErr","video")
                return callback(e)
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
            
            if(!media.play_num){
                return
            }
            // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
            //     if(err){
            //         logger.debug("读取redis出错")
            //         return
            //     }
            //     if(result > media.play_num){
            //         this.storaging.errStoraging('ifeng',`${option.url}`,task.id,`凤凰号视频播放量减少`,"playNumErr","video",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"video"*/)
            // })
            this.storaging.playNumStorage(media,"video")
            // logger.debug("ifeng media==============",media)
            callback()
        })
    }
}
module.exports = dealWith