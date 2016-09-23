/**
 * Created by yunsong on 16/7/28.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
const cheerio = require( 'cheerio' )

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
        async.series({
            user: (callback) => {
                this.getUser( task, task.id, (err) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,'用户信息已返回')
                })
            },
            media: (callback) => {
                this.getTotal( task, task.id, (err) => {
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
            callback(null,task.total)
        })
    }
    getUser ( task, id, callback){
        let option = {
            url: this.settings.fansNum + id
        }
        request.get( option, (err,result) => {
            if(err){
                return callback(err)
            }
            let $ = cheerio.load(result.body),
                num = $('.fright.statNum a .num').text(),
                user = {
                    platform: 14,
                    bid: task.id,
                    fans_num: num
                }
            this.sendUser(user ,(err,result) => {
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
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("酷6用户:",user.bid + ' back_end')
            }else{
                logger.error("酷6用户:",user.bid + ' back_error')
                logger.info(result)
            }
            callback()
        })
    }
    getTotal ( task, id, callback){
        logger.debug('开始获取视频总数')
        let option = {
                url: this.settings.listNum + id
            }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if( result.statusCode != 200 ){
                logger.debug(`酷6获取视频总数状态码错误:${result.statusCode}`)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                logger.info('json1 error :',result.body)
                return callback(e)
            }
            let total = parseInt(result.data.left) + parseInt(result.data.offset)
            task.total = total
            this.getList( task, total, (err) => {
                if(err){
                    return callback(err)
                }
                callback(null,'视频信息已返回')
            })
        })
    }
    getList ( task, total, callback ) {
        let sign = 1,
            newSign = 0,
            page,
            option
        if(total % 20 == 0 ){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页视频列表')
                option = {
                    url: this.settings.allInfo + task.id + "&pn=" + newSign
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
                        logger.info('json error: ', result.body)
                        return callback(e)
                    }
                    let list = result.data
                    if(list){
                        this.deal( task,list, () => {
                            sign++
                            newSign++
                            cb()
                        })
                    }else{
                        sign++
                        newSign++
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
                this.getInfo( task, list[index],(err) => {
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
        let time = data.uploadtime,
            a_create_time = time.substring(0,10),
            media = {
                author: data.nick,
                platform: 14,
                bid: task.id,
                aid: data.vid,
                title: data.title,
                desc: data.desc,
                play_num: data.viewed,
                support: data.liked,
                step: data.disliked,
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
            logger.debug(`酷6视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith