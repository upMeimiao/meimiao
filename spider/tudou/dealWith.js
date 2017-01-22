const async = require( 'async' )
const request = require( '../../lib/request' )
const cheerio = require('cheerio')
const moment = require('moment')
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
    getUser ( task, callback){
        const option = {
            url: `http://www.tudou.com/home/_${task.id}/`,
            ua:2
        }
        request.get(logger,option,(err,result)=>{
            if(err){
                return callback()
            }
            let $ = cheerio.load(result.body),
                script = $('script')[0].children[0].data
            script = script.slice(script.indexOf('var CONFIG')+13)
            script = script.replace(/;/g,'')
            let user_conf
            try {
                user_conf = eval("(" + script + ")")
            } catch (e){
                logger.error('土豆解析userconf失败')
                logger.error(script)
                return callback(e)
            }
            let uidCode = user_conf.uidCode
            this.getFans( task, uidCode, (err)=>{
                callback()
            })
        })
    }
    getFans ( task, uidCode, callback){
        let option = {
            url: this.settings.fans + uidCode
        }
        request.get( logger, option, (err, result)=>{
            if(err){
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`土豆粉丝 json数据解析失败`)
                logger.error(result)
                return callback(e)
            }
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: result.data.subedNum
            }
            //logger.debug(user)
            this.sendUser(user, () => {
                callback()
            })
            this.sendStagingUser(user)
        })
    }
    getTotal (task,callback){
        logger.debug('开始获取视频总数')
        let option = {
            url: this.settings.userInfo + task.id
        }
        request.get( logger, option,(err,result) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info('json error :',result.body)
                return callback(e)
            }
            task.total = result.video_count
            this.getList( task, result.video_count, (err) => {
                if(err){
                    return callback(err)
                }
                callback()
            })
        })
    }
    sendUser (user,callback){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(logger,option,(err,result) => {
            if(err){
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
        if(total % 40 == 0 ){
            page = total / 40
        }else{
            page = Math.ceil(total / 40)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页视频列表')
                option = {
                    url: this.settings.newList + `&uid=${task.id}&page=${sign}`
                }
                request.get(logger,option, (err,result) => {
                    if(err){
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.error('土豆列表json解析失败')
                        logger.error(result.body)
                        sign++
                        return cb()
                    }
                    if(!result.data){
                        sign++
                        return cb()
                    }
                    let list = result.data.data
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
        async.parallel([
            (cb) => {
                this.getExpr( data.code,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getVideoTime(data.code,(err,backData) => {
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
                author: task.name,
                platform: 12,
                bid: task.id,
                aid: data.code,
                title: data.title ? data.title.replace(/"/g,'') : 'btwk_caihongip',
                desc: data.comments ? data.comments.replace(/"/g,'') : '',
                play_num: data.playNum,
                save_num: result[0].favorNum,
                comment_num: result[0].commentNum,
                support: result[0].digNum,
                step: result[0].buryNum,
                v_img: data.picurl,
                long_t: this.long_t(data.formatTotalTime),
                class: result[1].class,
                tag: result[1].tag,
                a_create_time: data.pubDate.toString().substring(0,10)
            }
            if(!media.class){
                delete media.class
            }
            if(!media.tag){
                delete media.tag
            }
            //logger.debug(media)
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
    getVideoTime ( id, callback){
        let option = {
            url: this.settings.mediaTime + id
        }
        request.get( logger, option, (err,result) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info('backData:',result)
                return callback(e)
            }
            const data = {
                tag: result.tag,
                class: result.cname
            }
            callback(null,data)
        })
    }
    getExpr ( code,callback) {
        let option = {
            url: this.settings.expr + code
        }
        request.get( logger, option, (err,result) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('expr json数据解析失败')
                logger.info('backData:',result)
                return callback(e)
            }
            if(result.error != 0){
                logger.error(`expr error:${result.error},${result.msg}`)
                return callback(true)
            }
            if(!result.data){
                logger.error('expr error:',result)
                return callback(true)
            }
            callback(null,result.data)
        })

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
}
module.exports = dealWith