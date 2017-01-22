const async = require('async')
const request = require('../../lib/request')
const moment = require('moment')

let logger
class dealWith {
    constructor(spiderCore) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo( task, callback) {
        task.total = 0
        this.getTotal(task, (err) => {
            if(err){
                return callback(err)
            }
            callback(null,task.total)
        })
    }
    getTotal(task, callback){
        let option = {
            url: this.settings.medialist + task.id + '&pageNo=1',
            ua: 3,
            own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
        }
        request.get(logger, option, (err,result) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                logger.error('json error: ',result.body)
                return callback(e)
            }
            if(result.infoList.length == 0){
                return callback('异常错误')
            }
            task.total = result.infoList[0].weMedia.totalNum
            let user = {
                platform: 15,
                bid: task.id,
                fans_num: result.infoList[0].weMedia.followNo
            }
            async.parallel({
                user: (callback) => {
                    this.sendUser( user,(err,result) => {
                        callback(null,'用户信息已返回')
                    })
                    this.sendStagingUser(user)
                },
                media: (callback) => {
                    this.getList(task, result.infoList[0].weMedia.totalPage, (err) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,'视频信息已返回')
                    })
                }
            },(err,result) => {
                if(err){
                    return callback(err)
                }
                logger.debug('result:',result)
                callback()
            })
        })
    }
    sendUser( user,callback ){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(logger, option, (err,result) => {
            if (err) {
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error(`凤凰用户 ${user.bid} json数据解析失败`)
                logger.error(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug('凤凰用户: ',user.bid + ' back_end')
            }else{
                logger.error('凤凰用户: ',user.bid + ' back_error')
                logger.error(result)
                logger.error(`user info: `,user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post(logger, option,(err,result) => {
            if(err){
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.error('send error:',result)
                return
            }
            if(result.errno == 0){
                logger.debug("凤凰用户:",user.bid + ' back_end')
            }else{
                logger.error("凤凰用户:",user.bid + ' back_error')
                logger.error(result)
            }
        })
    }
    getList(task, page, callback){
        let index = 1,option = {
            ua: 3,
            own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
        }
        async.whilst(
            () => {
                return index <= page
            },
            (cb) => {
                logger.debug('开始获取第' + index + '页视频列表')
                option.url = this.settings.medialist + task.id + '&pageNo=' + index
                request.get(logger, option, (err,result) => {
                    if(err){
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        logger.error('json error: ',result.body)
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
            url: this.settings.info + video.memberItem.guid,
            ua: 3,
            own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
        },media
        request.get(logger, option, (err, result) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                logger.error('json error: ',result.body)
                return callback(err)
            }
            media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: result.itemId,
                title: result.title ? result.title.substr(0,100).replace(/"/g,'') : 'btwk_caihongip',
                desc: result.abstractDesc ? result.abstractDesc.substr(0,100).replace(/"/g,'') : (result.name ? result.name.substr(0,100).replace(/"/g,'') : ''),
                play_num: result.playTime,
                comment_num: result.commentNo,
                a_create_time: moment(result.createDate).format('X'),
                v_img: result.image,
                long_t: result.duration,
                tag: video.tag
            }
            this.sendCache(media)
            callback()
        })
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误', err )
                return
            }
            logger.debug(`凤凰视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith