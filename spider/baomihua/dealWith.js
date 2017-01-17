/**
 * Created by junhao on 16/7/28.
 */
const async = require( 'async' )
const request = require( '../../lib/request' )
const jsonp = function (data) {
    return data
}
let logger

class dealWith {
    constructor( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0
        async.parallel(
            {
                user: (cb) => {
                    this.getUser(task,(err)=>{
                        cb(null,"用户信息已返回")
                    })
                },
                media: (cb) => {
                    this.getList(task,(err) => {
                        if(err){
                            return cb(err)
                        }
                        cb(null,"视频信息已返回")
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                logger.debug(task.id + "_result:",result)
                callback(null,task.total)
            }
        )
    }
    getUser ( task, callback ) {
        let option = {
            url: this.settings.userInfo + task.id
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            result = result.result
            let user = {
                platform: 13,
                bid: task.id,
                fans_num: result.ChannelInfo.RssNum
            }
            this.sendUser( user, (err,result) => {
                callback()
            })
            this.sendStagingUser(user)
        })
    }
    sendUser ( user, callback){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post( logger,option, ( err, back ) => {
            if(err){
                return callback(err)
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`爆米花用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return callback(e)
            }
            if(back.errno == 0){
                logger.debug("爆米花用户:",user.bid + ' back_end')
            }else{
                logger.error("爆米花用户:",user.bid + ' back_error')
                logger.info(back)
                logger.info('user info: ',user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( logger,option,(err,result) => {
            if(err){
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',result)
                return
            }
            if(result.errno == 0){
                logger.debug("爆米花用户:",user.bid + ' back_end')
            }else{
                logger.error("爆米花用户:",user.bid + ' back_error')
                logger.info(result)
            }
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
                    option.url = this.settings.mediaList + task.id + `&minid=${minid}`
                }else{
                    option.url = this.settings.mediaList + task.id
                }
                request.get( logger,option, ( err, result ) => {
                    if(err){
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    result = result.result
                    if(!result.VideoList || result.VideoList == 'null'){
                        logger.debug('已经没有数据')
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
                this.getExpr( id, ( err, data ) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            ( cb ) => {
                this.getExprPC( id, ( err, data ) => {
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
            this.sendCache( media )
            callback()
        })
    }
    getExpr ( id, callback ) {
        let option = {
            url: this.settings.expr_m + id,
            ua: 3,
            own_ua:'BMHVideo/3.3.3 (iPhone; iOS 10.1.1; Scale/3.00)'
        }
        request.get( logger,option, ( err, result ) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('返回JSON格式不正确')
                logger.info('expr_m:',result)
                return callback(e)
            }
            callback(null,result.result.item[0])
        })
    }
    getExprPC ( id, callback ) {
        let option = {
            url: this.settings.expr_pc + id + '&_=' + (new Date()).getTime()
        }
        request.get( logger,option, ( err, result ) => {
            if(err){
                return callback(err)
            }
            try{
                result = eval(result.body)
            } catch (e){
                logger.error('getExpr jsonp error')
                logger.error(result.body)
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
            url: this.settings.play + `${task.id}&flvid=` + id
        }
        request.get( logger,option, ( err, result ) => {
            if(err){
                return callback(err)
            }
            result = eval(result.body)
            callback(null,result.appinfo[0].playCount)
        })
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`爆米花视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith