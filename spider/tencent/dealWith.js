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
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err)=>{
                        callback(null,"用户信息已返回")
                    })
                },
                media: (callback) => {
                    this.getTotal(task,(err)=>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,"视频信息已返回")
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
            try {
                result = JSON.parse(result.body.substring(6, result.body.length - 1))
            } catch (e){
                logger.error(result.body.substring(6, result.body.length - 1))
                return callback(e)
            }
            //logger.debug(result)
            if(result.s != 'o'){
                logger.error(`异常错误${result.em}`)
                return callback(result.em)
            }
            if(!result.vtotal){
                logger.error(`异常错误`)
                return callback(true)
            }
            task.total = result.vtotal
            this.getList(task,result.vtotal, (err) => {
                if(err){
                    return callback(err)
                }
                callback()
            })
        })
    }
    getUser (task,callback) {
        let option = {
            url: this.settings.user + task.id + "&_=" + new Date().getTime()
        }
        request.get( option, (err,result)=>{
            if(err){
                logger.error( 'occur error : ', err )
                return callback()
            }
            if(result.statusCode != 200){
                logger.error('tencent code error: ',result.statusCode)
                return callback()
            }
            try {
                result = eval(result.body)
            } catch (e){
                logger.error('tencent jsonp error: ',result)
                return callback()
            }
            let user = {
                platform: 4,
                bid: task.id,
                fans_num: result.followcount.indexOf('万') == -1 ? result.followcount : Number(result.followcount.replace(/万/g,'')) * 10000
            }
            this.sendUser (user,(err,result) => {
                callback()
            })
            this.sendStagingUser(user)
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
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
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
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.info(result)
            }
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
                    try {
                        result = JSON.parse(result.body.substring(6, result.body.length - 1))
                    } catch (e){
                        logger.error(result.body.substring(6, result.body.length - 1))
                        sign++
                        return cb()
                    }
                    let list = result.videolst
                    // logger.debug('videolst:', data)
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
        async.parallel([
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
                },
                (cb) => {
                    this.getVidTag(data.vid, (err,tags) => {
                        if(err){
                            cb(err)
                        }else {
                            cb(null,tags)
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
                    title: data.title.substr(0,100).replace(/"/g,''),
                    desc: data.desc.substr(0,100).replace(/"/g,''),
                    play_num: result[0],
                    comment_num: result[1],
                    a_create_time: this.time(data.uploadtime),
                    // 新加字段
                    v_img: data.pic,
                    long_t: this.long_t(data.duration),
                    tag: this.tags(result[2])
                }
                if(!media.comment_num){
                    delete media.comment_num
                }
                if(!media.tag){
                    delete media.tag
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
            if( result.statusCode != 200){
                logger.error( '腾讯获取评论数code错误 : ', result.statusCode )
                return callback(true)
            }
            let backData
            try {
                backData = eval(result.body)
            } catch (e) {
                logger.error('腾讯获取评论数jsonp解析失败')
                logger.error(result.body)
                return callback(e)
            }
            if(!backData.result){
                logger.error( '腾讯获取评论数异常错误' )
                logger.error(backData)
                return callback(true)
            }
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
            url: this.settings.commentNum + id + "/commentnum?_=" + new Date().getTime(),
            referer: 'https://v.qq.com/txyp/coralComment_yp_1.0.htm',
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36'
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
                return callback(null,null)
            }
            if(result.errCode == 0){
                callback(null,result.data.commentnum)
            } else {
                callback(null,null)
            }
        })
    }
    getVidTag( vid, callback ){
        const option = {
            url : "http://c.v.qq.com/videoinfo?otype=json&callback=jsonp&low_login=1&vid="+vid+"&fields=recommend%7Cedit%7Cdesc%7Cnick%7Cplaycount"
        }
        request.get( option, ( err, result ) => {
            if(err){
                return callback(err)
            }
            try{
                result = eval(result.body)
            } catch (e){
                return callback(null,null)
            }
            if(!result.v || result.v.length == 0){
                return callback(null,null)
            }
            const tagStr = result.v[0].tags_video
            callback(null,tagStr)
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
    long_t( time ){
        let timeArr = time.split(':'),
            long_t  = ''
        if(timeArr.length == 2){
            long_t = moment.duration( `00:${time}`).asSeconds()
        }else if(timeArr.length == 3){
            long_t = moment.duration(time).asSeconds()
        }
        return long_t
    }
    tags( raw ){
        if(typeof raw == 'string'){
            return raw.replace(/\s+/g,',').replace(/"/g,'').replace(/\[/g,'').replace(/\]/g,'')
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
}
module.exports = dealWith