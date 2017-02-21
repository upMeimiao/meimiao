const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require( '../lib/request' )
const storaging = require('./storaging')
const jsonp = function (data) {
    return data
}
let logger,api,settings,errDb

class iqiyiDeal {
    constructor(core){
        this.core = core
        this.settings = core.settings
        errDb = this.core.errDb
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.debug('处理器实例化...')
    }
    iqiyi(task,callback){
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
    getUser ( task, callback ){
        const option = {
            url: `http://m.iqiyi.com/u/${task.id}`,
            referer: `http://m.iqiyi.com/u/${task.id}`,
            ua: 2
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
				storaging.errStoraging(this.core,'iqiyi',option.url,task.id,err,"responseErr","user")
				return
            }
            if(!result || !result.body){
            	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,"iqiyi获取用户信息接口无返回数据","resultErr","user")
            	return
            }
            const $ = cheerio.load(result.body),
                fansDom = $('span.c-num-fans')
            if(fansDom.length === 0){
                return this.get_user(task,function () {
                    callback()
                })
            }
            storaging.succStorage(this.core,"iqiyi",option.url,"user")
            // const fans = fansDom.attr('data-num'),
            //     user = {
            //         platform: 2,
            //         bid: task.id,
            //         fans_num: fans
            //     }
        })
    }
    get_user ( task, callback) {
        const option = {
            url: `http://m.iqiyi.com/u/${task.id}/fans`,
            referer: `http://m.iqiyi.com/u/${task.id}`,
            ua: 2
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
				storaging.errStoraging(this.core,'iqiyi',option.url,task.id,err,"responseErr","_user")
            }
            if(!result.body){
            	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,"iqiyi获取粉丝接口无返回数据","resultErr","_user")
            }
            let $ = cheerio.load(result.body),
                fansDom = $('h3.tle').text(),
                user = {
                    platform: 2,
                    bid: task.id,
                    fans_num: fansDom.substring(2)
                }
            //logger.debug(user)
            storaging.succStorage(this.core,"iqiyi",option.url,"_user")
        })
    }
    getTotal(task, callback) {
        const option = {
            ua: 1,
            url: api.iqiyi.list[0] + task.id + "&page=1",
            referer: 'http://www.iqiyi.com/u/' + task.id + "/v"
        }
        request.get(logger, option, (err,result) => {
            if(err){
				storaging.errStoraging(this.core,'iqiyi',option.url,task.id,err,"responseErr","total")
                return
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'iqiyi',option.url,task.id,"iqiyi获取全部视频接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            if(result.total !== 0){
                task.total = result.total * 42
                this.getList(task, result.total, (err) => {
                    callback()
                })
            } else {
                this.getListN(task, (err) => {
                    callback()
                })
            }
            storaging.succStorage(this.core,"iqiyi",option.url,"total")
        })
    }
    getListN(task, callback) {
        let index = 1,
            sign = true
        const option = {
            ua: 1,
            referer: 'http://www.iqiyi.com/u/' + task.id + "/v"
        }
        async.whilst(
            () => {
                return sign
            },
            ( cb ) => {
                option.url = `http://www.iqiyi.com/u/${task.id}/v?page=1&video_type=1&section=${index}`
                request.get( logger, option, (err,result) => {
                    if(err){
                    	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,err,"responseErr","listN")
                        return cb()
                    }
                    if(!result.body){
                    	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,"iqiyi获取视频单页列表接口无返回数据","resultErr","listN")
                    }
                    const $ = cheerio.load(result.body,{
                            ignoreWhitespace:true
                        }),
                        titleDom = $('p.mod-piclist_info_title a'),
                        video = []
                    if(titleDom.length === 0){
                        task.total = 20 * (index -1)
                        sign = false
                        return cb()
                    }
                    for(let i = 0 ;i<titleDom.length;i++){
                        video.push({
                            title: titleDom[i].children[0].data,
                            link: titleDom[i].attribs['href']
                        })
                    }
                    //logger.debug(video)
                    storaging.succStorage(this.core,"iqiyi",option.url,"listN")
                    this.getIds(task, video, (err) => {
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
    getIds(task, raw, callback) {
        let index = 0
        const option = {
            ua: 1
        }
        async.whilst(
            () => {
                return index < raw.length
            },
            (cb) => {
                option.url = raw[index].link
                request.get(logger, option, (err, result) => {
                    if(err){
                    	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,err,"responseErr","ids")
                        return cb()
                    }
                    if(!result.body){
                    	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,"iqiyi获取视频id列表接口无返回数据","resultErr","ids")
                    }
                    const $ = cheerio.load(result.body,{
                            ignoreWhitespace:true
                        }),
                        id = $('#flashbox').attr('data-player-tvid')
                        if(!id){
                            storaging.errStoraging(this.core,'iqiyi',DOM,task.id,"iqiyi获取DOM元素中的视频id失败","domBasedErr","ids")
                        }
                    storaging.succStorage(this.core,"iqiyi",option.url,"ids")
                    this.info(task, {id: id, title: raw[index].title, link: raw[index].link},(err)=>{
                        index++
                        cb()
                    })
                })
            },
            (err, result) => {
                callback()
            }
        )
    }
    getList(task, page, callback) {
        let index = 1
        const option = {
            ua: 1,
            referer: 'http://www.iqiyi.com/u/' + task.id + "/v"
        }
        async.whilst(
            () => {
                return index <= page
            },
            ( cb ) => {
                option.url = api.iqiyi.list[0] + task.id + "&page=" + index
                request.get( logger, option, (err,result) => {
                    if(err){
                    	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,err,"responseErr","list")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('json数据解析失败')
                        storaging.errStoraging(this.core,'iqiyi',option.url,task.id,"iqiyi获取视频列表接口json数据解析失败","doWithResErr","list")
                        logger.error(result)
                        return cb()
                    }
                    const data = result.data,
                        $ = cheerio.load(data,{
                            ignoreWhitespace:true
                        })
                    if($('.wrap-customAuto-ht li').length === 0){
                        index++
                        return cb()
                    }
                    const lis = $('li[tvid]'),ids = [],
                        ats = $('a[data-title]'),titles = [],
                        href = $('.site-piclist_info a[title]'),links = []
                    if(!lis || !ats || !href){
                        storaging.errStoraging(this.core,'iqiyi',DOM,task.id,"iqiyi由DOM获取视频列表信息失败","domBasedErr","list")
                    }
                    for(let i = 0 ;i<lis.length;i++){
                        ids.push(lis[i].attribs.tvid.replace(/,/g,''))
                    }
                    //logger.debug(ids)
                    for(let j = 0;j<ats.length;j++){
                        titles.push(ats[j].attribs['data-title'])
                    }
                    //logger.debug(titles)
                    for(let z = 0 ;z<href.length;z++){
                        let id = href[z].attribs.href,
                            end = id.indexOf('#')
                        id = id.slice(0,end)
                        links.push(id)
                    }
                    storaging.succStorage(this.core,"iqiyi",option.url,"list")
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
    deal( task, ids, titles, links, callback ){
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
                        return cb()
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
        async.parallel(
            [
                (callback) => {
                    this.getInfo(task,id,link, (err,data) => {
                        if(err){
                        	storaging.errStoraging(this.core,'iqiyi',link,task.id,err,"responseErr","info")
                            callback(err)
                        } else {
                            callback(null,data)
                        }
                    })
                },
                (callback) => {
                    this.getExpr(task,id,link, (err,data) => {
                        if(err){
                        	storaging.errStoraging(this.core,'iqiyi',link,task.id,err,"responseErr","info")
                            callback(err)
                        } else {
                            callback(null,data)
                        }
                    })
                },
                (callback) => {
                    this.getPlay(task,id,link, (err,data) => {
                        if(err){
                        	storaging.errStoraging(this.core,'iqiyi',link,task.id,err,"responseErr","info")
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
                    title: title ? title.substr(0,100) : 'btwk_caihongip',
                    desc: result[0].desc.substr(0,100),
                    play_num: result[2],
                    support: result[1].data.up,
                    step: result[1].data.down,
                    comment_num: result[0].comment,
                    a_create_time: result[0].time,
                    // 新加字段
                    v_url:result[0].v_url,
                    long_t: result[0].seconds,
                    v_img: result[0].picurl,
                    class: result[0].type
                }
                this.core.MSDB.hget(`${media.author}:${media.aid}`,"play_num",(err,result)=>{
                    if(err){
                        logger.debug("读取redis出错")
                        return
                    }
                	if(result > media.play_num){
                        storaging.errStoraging(this.core,'iqiyi',`${api.iqiyi.play}${media.aid}?callback=jsonp`,task.bid,`爱奇艺视频${media.aid}播放量减少`,"resultErr","info")
                    }
                })

                if(media.comment_num < 0){
                    delete media.comment_num
                }
                storaging.sendDb( this.core,media )
                callback()
            }
        )
    }
    getInfo ( task, id, link, callback ) {
        let option = {
            url: api.iqiyi.info + id + "?callback=jsonp&status=1",
            referer: link,
            ua: 1
        }
        request.get( logger, option, (err,result) => {
            if(err){
            	storaging.errStoraging(this.core,'iqiyi',link,task.id,err,"responseErr","info")
                return callback(err)
            }
            //logger.debug(backData)
            let playData
            try {
                playData = eval(result.body)
            } catch (e){
                logger.error('eval错误:',e)
                storaging.errStoraging(this.core,'iqiyi',link,task.id,"iqiyi获取视频信息接口eval错误","doWithResErr","info")
                logger.error(result)
                return callback(e)
            }
            if(playData.code != 'A00000'){
                return callback(true)
            }
            //console.log(playData)
            let name = playData.data.user.name,
                desc = playData.data.description,
                comment = playData.data.commentCount,
                creatTime = parseInt(playData.data.issueTime / 1000),
                // 新加字段
                picurl = playData.data.imageUrl,
                typeArr = playData.data.categories,
                seconds = playData.data.duration,
                v_url = playData.data.url,
                type = ''
            if(typeArr && typeArr.length !=0 ){
                const t_arr = []
                for(let index in typeArr){
                    t_arr[index] = typeArr[index].name
                }
                type = t_arr.join(',')
            }
            if(creatTime === 0){
                creatTime = 1349020800
            }
            const data = {
                name: name,
                desc: desc,
                comment: comment,
                time: creatTime,
                // 新加字段
                v_url:v_url,
                picurl:picurl,
                type:type,
                seconds:seconds
            }
            storaging.succStorage(this.core,"iqiyi",option.url,"info")
            if(comment < 0){
                this.getComment(playData.data.qitanId,playData.data.albumId,playData.data.tvId,link,(err,result)=>{
                    if(err){
                    	storaging.errStoraging(this.core,'iqiyi',link,task.id,err,"responseErr","info")
                        return callback(null,data)
                    }
                    data.comment = result
                    callback(null,data)
                })
            }else{
                callback(null,data)
            }
        })
    }
    getExpr (task, id, link, callback ) {
        const option = {
            url: api.iqiyi.expr + id,
            referer: link,
            ua: 1
        }
        request.get( logger, option, (err,result) => {
            if(err){
            	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,err,"responseErr","Expr")
                return callback(err)
            }
            //logger.debug(result)
            let infoData
            try {
                infoData = eval(result.body)
            } catch (e){
                logger.error('eval错误:',e)
                storaging.errStoraging(this.core,'iqiyi',option.url,task.id,"iqiyi获取视频顶踩信息接口eval错误","doWithResErr","Expr")
                logger.error(result)
                return callback(e)
            }
            if(infoData.code != 'A00000'){
                return callback(true)
            }
            storaging.succStorage(this.core,"iqiyi",option.url,"Expr")
            callback(null,infoData)
        })
    }
    getPlay ( task,id, link, callback ) {
        const option = {
            url: api.iqiyi.play + id + '/?callback=jsonp',
            referer: link,
            ua: 1
        }
        request.get( logger, option, (err,result) => {
            if(err){
            	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,err,"responseErr","play")
                return callback(err)
            }
            //logger.debug(result)
            let infoData
            try {
                infoData = eval(result.body)
            } catch (e){
                logger.error('eval错误:',e)
                storaging.errStoraging(this.core,'iqiyi',option.url,task.id,"iqiyi获取视频播放量接口eval错误","doWithResErr","play")
                logger.error(result)
                return callback(e)
            }
            storaging.succStorage(this.core,"iqiyi",option.url,"play")
            callback(null,infoData[0][id])
        })
    }
    getComment (qitanId,albumId,tvId,link,callback){
        const option = {
            url: `http://cmts.iqiyi.com/comment/tvid/${qitanId}_${tvId}_hot_2?is_video_page=true&albumid=${albumId}`,
            referer: link,
            ua: 1
        }
        request.get( logger, option, (err,result) => {
            if(err){
            	storaging.errStoraging(this.core,'iqiyi',option.url,task.id,err,"responseErr","comment")
                return callback(err)
            }
            //logger.debug(result)
            let infoData
            try {
                infoData = JSON.parse(result.body)
            } catch (e){
                logger.error('json err:',e)
                storaging.errStoraging(this.core,'iqiyi',option.url,task.id,"iqiyi获取评论信息接口json数据解析失败","doWithResErr","comment")
                logger.error(result)
                return callback(e)
            }
            storaging.succStorage(this.core,"iqiyi",option.url,"comment")
            callback(null,infoData.data.$comment$get_video_comments.data.count)
        })
    }
}
module.exports = iqiyiDeal