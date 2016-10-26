/**
 * Created by junhao on 16/6/22.
 */
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require( '../lib/req_iqiyi' )
let logger
const jsonp = function (data) {
    return data
}
class dealWith {
    constructor(spiderCore) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0
        async.series(
            {
                user: (callback) => {
                    this.getUser(task,(err)=>{
                        callback(null,"用户信息已返回")
                    })
                },
                media: (callback) => {
                    this.getTotal( task, ( err ) => {
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
    getUser ( task, callback ){
        let option = {
            url: `http://m.iqiyi.com/u/${task.id}`,
            referer: `http://m.iqiyi.com/u/${task.id}`,
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
        }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error( '获取爱奇艺视频粉丝状态码错误' )
                return callback(true)
            }
            let $ = cheerio.load(result.body),
                fansDom = $('span.c-num-fans')
            if(fansDom.length === 0){
                return this.get_user(task,function () {
                    callback()
                })
            }
            let fans = fansDom.attr('data-num'),
                user = {
                    platform: 2,
                    bid: task.id,
                    fans_num: fans
                }
            //logger.debug(user)
            this.sendUser ( user,(err,result) => {
                callback()
            })
        })
    }
    get_user ( task, callback) {
        let option = {
            url: `http://m.iqiyi.com/u/${task.id}/fans`,
            referer: `http://m.iqiyi.com/u/${task.id}`,
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
        }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error( '获取爱奇艺视频粉丝状态码错误' )
                return callback(true)
            }
            let $ = cheerio.load(result.body),
                fansDom = $('h3.tle').text(),
                user = {
                    platform: 2,
                    bid: task.id,
                    fans_num: fansDom.substring(2)
                }
            //logger.debug(user)
            this.sendUser ( user,(err,result) => {
                callback()
            })
        })
    }
    sendUser ( user, callback ){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(option, (err,result)=>{
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回爱奇艺用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`爱奇艺用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("爱奇艺用户:",user.bid + ' back_end')
            }else{
                logger.error("爱奇艺用户:",user.bid + ' back_error')
                logger.info(result)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    getTotal ( task, callback ) {
        let option,
            page
        option = {
            url: this.settings.list[0] + task.id + "&page=" + 1,
            host: 'www.iqiyi.com',
            referer: this.settings.list[1] + task.id + "/v",
            ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.84 Safari/537.36'
        }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error( '获取爱奇艺视频总数状态码错误' )
                return callback(true)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            page = result.total
            task.total = page * 42
            if(page == 0){
                option = {
                    url: this.settings.list[1] + task.id + "/v"
                }
                request.get( option,(err,result) => {
                    if(err){
                        logger.error('occur error: ',err)
                        return callback(err)
                    }
                    if(result.statusCode != 200){
                        logger.error( '获取爱奇艺视频总数状态码错误' )
                        return callback(true)
                    }
                    let $ = cheerio.load(result.body),
                        username = $('.pf_username .username').text()
                    if(username == ''){
                        let totalText = $('.num_item a').text(),
                            text = totalText.replace(/,/ig,'').split('视频'),
                            total = text[0]
                        task.total = total
                        if(total % 42 == 0){
                            page = total / 42
                        }else{
                            page = Math.ceil(total / 42)
                        }
                        this.getVideos( task, page, (err) => {
                            if(err){
                                return callback(err)
                            }
                            return callback()
                        })
                    }
                })
            }else{
                this.getVideos( task, page, (err) => {
                    if(err){
                        return callback(err)
                    }
                    callback()
                })
            }
        })

    }
    getVideos ( task, page, callback ) {
        let index = 1,
            option = {
                host: 'www.iqiyi.com'
            }
        async.whilst(
            () => {
                return index <= page
            },
            ( cb ) => {
                option.url = this.settings.list[0] + task.id + "&page=" + index
                option.referer = 'http://www.iqiyi.com/u/' + task.id + "/v"
                request.get( option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return cb()
                    }
                    if(result.statusCode != 200){
                        logger.error( '获取爱奇艺视频列表错误,第'+ index + '页' )
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return callback(e)
                    }
                    let data = result.data,
                        $ = cheerio.load(data,{
                            ignoreWhitespace:true
                        }),
                        lis = $('li[tvid]'),ids = [],
                        ats = $('a[data-title]'),titles = [],
                        href = $('.site-piclist_info a[title]'),links = []
                    for(let i = 0 ;i<lis.length;i++){
                        let id = lis[i].attribs.tvid.replace(/,/g,'')
                        ids.push(id)
                    }
                    //logger.debug(ids)
                    for(let j = 0;j<ats.length;j++){
                        let title = ats[j].attribs['data-title']
                        titles.push(title)
                    }
                    //logger.debug(titles)
                    for(let z = 0 ;z<href.length;z++){
                        let id = href[z].attribs.href,
                            end = id.indexOf('#')
                        id = id.slice(0,end)
                        links.push(id)
                    }
                    this.deal(task,ids,titles,links, () => {
                        index++
                        cb()
                    })
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    deal ( task, ids, titles, links, callback ) {
        let index = 0,
            length = ids.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                let data = {
                    id: ids[index],
                    title: titles[index],
                    link: links[index]
                }
                this.info(task,data, (err) => {
                    if(err){
                        //setTimeout(cb,600)
                        index++
                        cb()
                        return
                    }
                    index++
                    cb()
                    //setTimeout(cb,600)
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    info ( task, info, callback ) {
        let id = info.id, title = info.title,link = info.link
        async.series(
            [
                (callback) => {
                    this.getInfo(id,link, (err,data) => {
                        if(err){
                            callback(err)
                        } else {
                            callback(null,data)
                        }
                    })
                },
                (callback) => {
                    this.getExpr(id,link, (err,data) => {
                        if(err){
                            callback(err)
                        } else {
                            callback(null,data)
                        }
                    })
                }
            ], (err,result) => {
                if(err){
                    return callback(err)
                }
                let media = {
                    author: result[0].name,
                    platform: 2,
                    bid: task.id,
                    aid: id,
                    title: title,
                    desc: result[0].desc,
                    play_num: result[0].play,
                    support: result[1].data.up,
                    step: result[1].data.down,
                    comment_num: result[0].comment,
                    a_create_time: result[0].time
                }
                this.sendCache( media )
                callback()
            }
        )
    }
    getInfo ( id, link, callback ) {
        let option = {
            url: this.settings.info + id + "?callback=jsonp&status=1",
            host: 'mixer.video.iqiyi.com',
            referer: link
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error( '获取爱奇艺视频总数状态码错误' )
                return callback(true)
            }
            result = result.body.replace(/try{/g,'').replace(/;/g,'').replace(/}catch\(e\)\{\}/g,'')
            //logger.debug(backData)
            let playData
            try {
                playData = eval("("+result+")")
            } catch (e){
                logger.error('eval错误:',e)
                logger.error(result)
                return callback(e)
            }
            if(playData.code != 'A00000'){
                return callback(true)
            }
            let name = playData.data.user.name,
                playNum = playData.data.playCount,
                desc = playData.data.description,
                comment = playData.data.commentCount,
                creatTime = parseInt(playData.data.issueTime / 1000),
                data = {
                    name: name,
                    play: playNum,
                    desc: desc,
                    comment: comment,
                    time: creatTime
                }
            callback(null,data)
        })
    }
    getExpr ( id, link, callback ) {
        let option = {
            url: this.settings.expr + id,
            host: 'up.video.iqiyi.com',
            referer: link
        }
        request.get( option, (err,result) => {
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error( '获取爱奇艺视频扩展信息状态码错误' )
                return callback(true)
            }
            result = result.body.replace(/try{/g,'').replace(/}catch\(e\)\{\}/g,'')
            //logger.debug(result)
            let infoData
            try {
                infoData = eval("("+result+")")
            } catch (e){
                logger.error('eval错误:',e)
                logger.error(result)
                return callback(e)
            }
            if(infoData.code != 'A00000'){
                return callback(true)
            }
            callback(null,infoData)
        })
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`爱奇艺视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith