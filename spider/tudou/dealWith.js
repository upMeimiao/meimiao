/**
 * Created by yunsong on 16/7/28.
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
                platform: 12,
                bid: task.id,
                fans_num: result.subed_count
            }
            task.total = result.video_count
            async.series({
                user: (callback) => {
                    this.sendUser (user,(err,result)=>{
                        callback(null,'用户信息已返回')
                    })
                },
                media: (callback) => {
                    this.getList( task, result.video_count, (err) => {
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
                logger.info(`返回土豆用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`土豆用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("土豆用户:",user.bid + ' back_end')
            }else{
                logger.error("土豆用户:",user.bid + ' back_error')
                logger.info(result)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    getList ( task, total, callback ) {
        let sign = 1,
            page,
            option
        if(total % 30 == 0 ){
            page = total / 30
        }else{
            page = Math.ceil(total / 30)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页视频列表')
                option = {
                    url: this.settings.list + task.id + "&page_no=" + sign
                }
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ' + err )
                        return cb()
                    }
                    if(result.statusCode != 200){
                        logger.error( `第${sign}页视频状态码${result.statusCode}` )
                        return cb()
                    }
                    let data = JSON.parse(result.body),
                        list = data.items
                    if(list){
                        this.deal(task,list, () => {
                            sign++
                            cb()
                        })
                    }else{
                        sign++
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
                this.getInfo(task,list[index],(err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, data, callback ) {
        async.series([
            (cb) => {
                this.getVideo(data.icode,(err,backData) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,backData)
                })
            },
            (cb) => {
                this.getVideoTime(data.icode,(err,backData) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,backData)
                })
            }
        ],(err,result) => {
            if(err){
                return callback(err)
            }
            let media = {
                author: result[0].detail.username,
                platform: 12,
                bid: task.id,
                aid: result[0].detail.iid,
                title: result[0].detail.title,
                desc: result[0].detail.desc,
                play_num: data.playtimes,
                save_num: result[0].detail.total_fav,
                comment_num: result[0].detail.total_comment,
                support: result[0].detail.subed_num,
                a_create_time: result[1]
            }
            this.sendCache( media )
            callback()
        })
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`土豆视频 ${media.aid} 加入缓存队列`)
        } )
    }  
    getVideo ( id, callback){
        let option = {
            url: this.settings.media + id
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info('backData:',result)
                return callback(e)
            }
            if(result.error_code_api == 0){
                callback(null,result)
            } else {
                callback(true)
            }
        })
    }
    getVideoTime ( id, callback){
        let option = {
            url: this.settings.mediaTime + id
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ',err)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info('backData:',result)
                return callback(e)
            }
            let time = result.pt,
                create_time = time.toString().substring(0,10)
            callback(null,create_time)
        })
    }
}
module.exports = dealWith