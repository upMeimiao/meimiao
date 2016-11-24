/**
 * Created by yunsong on 16/8/1.
 */
const async = require('async')
const request = require('../lib/req')
const moment = require('moment')

let logger
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo( task, callback) {
        task.total = 0
        async.series({
            user: (callback) => {
                this.getUser(task , task.id, (err) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,'用户信息已返回')
                })
            },
            media: (callback) => {
                this.getList( task, task.id, (err) => {
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
            callback(null,task.total)
        })
    }
    getUser(task, id, callback){
        let option = {
            url: this.settings.userInfo + id
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                logger.info('json error: ',result.body)
                return callback(e)
            }
            let user = {
                platform: 15,
                bid: task.id,
                fans_num: result.data.fans
            }
            this.sendUser( user,(err,result) => {
                callback()
            })
            this.sendStagingUser(user)
        })
    }
    sendUser( user,callback ){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post( option, (err,result) => {
            if (err) {
                logger.error('occur error:',err)
                logger.info(`返回北京时间用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error(`北京时间用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug('北京时间用户: ',user.bid + ' back_end')
            }else{
                logger.error('北京时间用户: ',user.bid + ' back_error')
                logger.info(result)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.caihongip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
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
                logger.debug("北京时间用户:",user.bid + ' back_end')
            }else{
                logger.error("北京时间用户:",user.bid + ' back_error')
                logger.info(result)
            }
        })
    }
    getList(task ,id ,callback ){
        let sign = 1,
            isSign = true
        async.whilst(
            () => {
                return isSign
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页视频列表')
                let option = {
                    url: this.settings.medialist + id + '&pageNo=' + sign
                }
                request.get( option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return callback(err)
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        logger.info('json error: ',result.body)
                        return callback(e)
                    }
                    let list = result.data
                    if(list.length >= 20){
                        this.deal(task,list,() => {
                            sign++
                            cb()
                        })
                    }else{
                        this.deal(task,list,() => {
                            task.total = sign * 20
                            isSign = false
                            cb()
                        })
                    }
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
    getVideo(task ,data ,callback ) {
        let time = data.ctime,
            a_create_time = moment(time).format('X'),
            media = {
                author: task.name,
                platform: 15,
                bid: task.id,
                aid: data.id,
                title: data.title.substr(0,100),
                desc: data.description.substr(0,100),
                play_num: data.click_count,
                comment_num: data.comment,
                a_create_time: a_create_time
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
            logger.debug(`北京时间 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith