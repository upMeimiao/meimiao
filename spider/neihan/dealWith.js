/**
 * Created by yunsong on 16/8/4.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
let logger
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo (task,callback) {
        task.total = 0
        this.getTotal (task,(err) => {
            if(err){
                return callback(err)
            }
            callback(null,task.total)
        })
    }
    getTotal (task,callback){
        logger.debug('开始获取视频总数')
        let option = {
            url: this.settings.userInfo + task.id
        }
        request.get(option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info('json error :',result.body)
                return callback(e)
            }
            let user = {
                platform: 19,
                bid: task.id,
                fans_num: result.data.followers
            }
            async.series({
                user: (callback) => {
                    this.sendUser (user,(err,result)=>{
                        callback(null,'用户信息已返回')
                    })
                },
                media: (callback) => {
                    this.getList( task, (err) => {
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
                logger.debug('result : ',result)
                callback()
            })
        })
    }
    sendUser (user,callback){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回内涵段子用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`内涵段子用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("内涵段子用户:",user.bid + ' back_end')
            }else{
                logger.error("内涵段子用户:",user.bid + ' back_error')
                logger.info(result)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    getList ( task, callback ) {
        let sign = 1,
            isSign = true,
            option,
            time
        async.whilst(
            () => {
                return isSign
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页视频列表')
                if(!time){
                    option = {
                        url: this.settings.medialist + task.id + '&min_time=0'
                    }
                }else{
                    option = {
                        url: this.settings.medialist + task.id + "&max_time=" + time
                    }
                }
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ' + err )
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        logger.info('json error: ',result.body)
                        return callback(e)
                    }
                    let list = result.data.data
                    if(list.length != 0){
                        this.deal( task, list, () => {
                            time = list[list.length-1].group.online_time
                            sign++
                            cb()
                        })
                    }else{
                        task.total = sign * 20
                        isSign = false
                        cb()
                    }
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, list, callback) {
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                let group = list[index].group,
                    type = group.media_type
                if(type == 3){
                    this.getInfo(task,list[index],(err) => {
                        index++
                        cb()
                    })
                }else{
                    index++
                    cb()
                }
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, data, callback ) {
        let group = data.group,
            title
        if(group.title != ''){
            title = group.title
        }else{
            title = '未知视频' + group.id_str
        }
        let media = {
                author: group.user.name,
                platform: 19,
                bid: task.id,
                aid: group.id_str,
                title: title,
                desc: group.text,
                play_num: group.play_count,
                save_num: group.favorite_count,
                forward_num: group.share_count,
                comment_num: group.comment_count,
                support: group.digg_count,
                step: group.bury_count,
                a_create_time: group.create_time
            }
        this.sendCache( media )
        callback()
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`内涵段子 ${media.aid} 加入缓存队列`)
        } )
    }  
}
module.exports = dealWith