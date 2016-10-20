/**
 * Created by junhao on 16/6/20.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../lib/req' )
const jsonp = function (data) {
    return data
}
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
        this.getTotal(task,(err) => {
            if(err){
                return callback(err)
            }
            callback(null,task.total)
        })
    }
    getTotal (task,callback) {
        logger.debug("开始获取视频总数")
        let option = {
            url: this.settings.videoList + task.id + "&pagenum=1"
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            result = eval(result.body)
            if(result.s != 'o'){
                logger.error(`异常错误${result.em}`)
                return callback(result.em)
            }
            let videolst = result.videolst
            if(!videolst || videolst.length == 0){
                logger.error(`异常错误`)
                return callback(true)
            }
            task.total = result.vtotal
            async.series({
                user: (callback) => {
                    if(result.videolst[0]){
                        this.getUser(task,result.videolst[0].vid,(err)=>{
                            if(err){
                                return callback(null,"用户信息获取错误")
                            }
                            callback(null,"用户信息已返回")
                        })
                    }else{
                        callback(null,"发生未知错误")
                    }
                },
                media: (callback) => {
                    this.getList(task,result.vtotal, (err) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,"视频信息已返回")
                    })
                }
            },(err,result) => {
                if(err){
                    return callback(err)
                }
                logger.debug("result:",result)
                callback()
            })
        })
    }
    getUser (task,id,callback) {
        let option = {
            url: this.settings.user + id + "&_=" + new Date().getTime()
        }
        request.get( option, (err,result)=>{
            if(err){
                logger.error( 'occur error : ', err )
                return callback()
            }
            result = eval(result.body)
            if(result.result){
                return callback()
            }
            let userInfo = result.vppinfo,
                user = {
                    platform: 4,
                    bid: userInfo.euin,
                    fans_num: userInfo.count1
                }
            this.sendUser (user,(err,result) => {
                callback()
            })
        })
    }
    sendUser (user,callback){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post( option, ( err, back ) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回腾讯视频用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`腾讯视频用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return callback(e)
            }
            if(back.errno == 0){
                logger.debug("腾讯视频用户:",user.bid + ' back_end')
            }else{
                logger.error("腾讯视频用户:",user.bid + ' back_error')
                logger.info(back)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    getList ( task, total, callback ) {
        let sign = 1,
            page,
            option
        if(total % 25 == 0){
            page = total / 25
        }else{
            page = Math.ceil(total / 25)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug("开始获取第"+ sign +"页视频列表")
                option = {
                    url: this.settings.videoList + task.id + "&pagenum="+sign
                }
                request.get( option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return cb()
                    }
                    //logger.debug(back.body)
                    let data = eval(result.body)
                    logger.debug('videolst:', data)
                    let list = data.videolst
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
    deal ( task, list, callback ) {
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.getInfo(task,list[index], (err) => {
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
                this.getView(data.vid, (err,num) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,num)
                    }
                })
            },
            (cb) => {
                this.getComment(data.vid, (err,num) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,num)
                    }
                })
            }
        ],
        (err,result) => {
            if(err){
                return callback(err)
            }
            let media = {
                author: task.name,
                platform: 4,
                bid: task.id,
                aid: data.vid,
                title: data.title,
                desc: data.desc,
                play_num: result[0],
                comment_num: result[1],
                a_create_time: this.time(data.uploadtime)
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
            logger.debug(`腾讯视频 ${media.aid} 加入缓存队列`)
        } )
    }
    getView ( id, callback ) {
        let option = {
            url: this.settings.view + id
        }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error(`状态码错误,${result.statusCode}`)
                return callback(true)
            }
            let backData = eval(result.body),
                back = backData.results
            if(!back){
                return callback(true)
            }
            if(back[0].fields){
                callback(null,back[0].fields.view_all_count)
            }else{
                callback(null,0)
            }
        })
    }
    getComment ( id, callback ) {
        let option = {
            url: this.settings.commentId + id
        }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            let backData = eval(result.body)
            if(backData.result.code == 0){
                this.getCommentNum(backData.comment_id, (err,num) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,num)
                })
            }else{
                callback(true)
            }
        })
    }
    getCommentNum ( id, callback ) {
        let option = {
            url: this.settings.commentNum + id + "/commentnum"
        }
        request.get(option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch ( e ) {
                logger.error(`获取视频${id}评论解析JSON错误`)
                logger.info(result)
                return callback(e)
            }
            if(result.errCode == 0){
                callback(null,result.data.commentnum)
            } else {
                callback(true)
            }
        })
    }
    time ( string ) {
        if(string.indexOf("-") != -1){
            return moment(string).unix()
        }
        if(string.indexOf("小时") != -1){
            string = string.substring(0, string.indexOf("小时"))
            return moment(moment().subtract(Number(string), 'h').format("YYYY-MM-DD")).unix()
        }
        if(string.indexOf("分钟") != -1){
            return moment(moment().format("YYYY-MM-DD")).unix()
        }
    }
}
module.exports = dealWith