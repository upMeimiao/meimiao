/**
 * Created by junhao on 16/6/21.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
const storaging = require('./storaging')
let logger,api
const jsonp = function (data) {
    return data
}
class souhuDealWith {
    constructor ( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        api = this.settings.spiderAPI
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    souhu ( task, callback ) {
        task.total = 0
        async.parallel({
            user: (callback) => {
                this.getUser(task,(err,result)=>{
                    callback(err,result)
                })
            },
            media: (callback) => {
                this.getTotal(task,(err,result)=>{
                    callback(err,result)
                })
            }
        }, ( err, result ) => {
            if ( err ) {
                return callback(err)
            }
            callback(err,result)
        })
    }
    getUser ( task, callback) {
        let option ={
            url: api.souhu.newUser + task.id + ".json?api_key=" + api.souhu.key +  "&_=" + (new Date()).getTime()
        }
        request.get ( option,(err,result)=>{
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,err,"responseErr","user")
            //     return callback()
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取粉丝接口无返回内容","resultErr","user")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取粉丝code error：',result.statusCode)
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取粉丝code error","responseErr","user")
            //     return callback()
            // }
            storaging.judgeRes (this.core,"souhu",option.url,task.id,err,result,callback,"user")
            if(!result){
                return 
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取粉丝json数据解析失败","doWithResErr","user")
                return callback()
            }
            // let userInfo = result.data,
            //     user = {
            //         platform: 9,
            //         bid: userInfo.user_id,
            //         fans_num: userInfo.total_fans_count
            //     }
            storaging.succStorage(this.core,"souhu",option.url,"user")
        })
    }
    getTotal ( task, callback ) {
        let option = {
            url: api.souhu.newList + task.id + "&page=1&_=" + new Date().getTime()
        }
        request.get(option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,err,"responseErr","total")
            //     return callback(err)
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取total接口无返回内容","resultErr","total")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取total接口code error：',result.statusCode)
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取total接口code error","responseErr","total")
            //     return callback()
            // }
            storaging.judgeRes (this.core,"souhu",option.url,task.id,err,result,callback,"total")
            if(!result){
                return 
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取total接口json数据解析失败","doWithResErr","total")
                logger.debug('getTotal:',result)
                return callback(e)
            }
            //logger.debug(back)
            let total  = result.data.totalCount
            task.total = total
            storaging.succStorage(this.core,"souhu",option.url,"total")
            this.getList(task,total, () => {
                callback()
            })
        })
    }
    getList ( task, total, callback ) {
        let index = 1, page, option
        if(total % 20 != 0){
            page = Math.ceil(total / 20)
        }else{
            page = total / 20
        }
        async.whilst(
            () => {
                return index <= page
            },
            (cb) => {
                option = {
                    url: api.souhu.newList + task.id + "&page=" + index + "&_=" + new Date().getTime()
                }
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        storaging.errStoraging(this.core,'souhu',option.url,task.id,err,"responseErr","list")
                        return cb()
                    }
                    if(!result){
                        storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取list接口无返回内容","resultErr","list")
                        return cb()
                    }
                    if(result.statusCode != 200){
                        logger.error(`${index}状态码错误`)
                        storaging.errStoraging(this.core,'souhu',option.url,task.id,`搜狐获取list接口${index}状态码错误`,"responseErr","list")
                        logger.debug('code:',result.statusCode)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取list接口json数据解析失败","doWithResErr","list")
                        logger.debug('list:',result)
                        return cb()
                    }
                    let data = result.data.videos
                    if(!data){
                        index++
                        return cb()
                    }
                    storaging.succStorage(this.core,"souhu",option.url,"list")
                    this.deal(task,data, () => {
                        index++
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
            (cb) => {
                // let video = list[index]
                // video = {
                //     aid: video.aid,
                //     id: video.vid
                // }
                this.info(task,list[index].id, (err) => {
                    if(err){
                        index++
                        return cb()
                    }
                    index++
                    cb()
                })
            },
            function (err,result) {
                callback()
            }
        )
    }
    info ( task, id, callback ) {
        async.parallel([
            (cb) => {
                this.getInfo(task, id, (err,data) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            (cb) => {
                this.getDigg(task, id, (err,data) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            (cb) => {
                this.getCommentNum(task, id,(err,num) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,num)
                     }
                })
            }
        ],
        (err,result) => {
            //logger.debug(result)
            if(err){
                return callback(err)
            }
            let media = {
                author: task.name,
                platform: 9,
                bid: task.id,
                aid: id,
                title: result[0].title.substr(0,100).replace(/"/g,''),
                desc: result[0].desc.substr(0,100).replace(/"/g,''),
                play_num: result[0].play,
                comment_num: result[2],
                support:result[1].up,
                step:result[1].down,
                a_create_time: result[0].time,
                long_t: result[0].seconds,
                tag: result[0].tag,
                class: result[0].type,
                v_img: result[0].picurl
            }
            if(!media.class){
                delete media.class
            }
            this.core.MSDB.hget(`${media.author}:${media.aid}`,"play_num",(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    storaging.errStoraging(this.core,'souhu',`${api.souhu.videoInfo}${media.aid}.json?site=2&api_key=695fe827ffeb7d74260a813025970bd5&aid=0`,task.id,`搜狐${media.aid}播放量减少`,"resultErr","info")
                    return
                }
            })
            storaging.sendDb(this.core,media)
            callback()
        })
    }
    getInfo ( task, id, callback ) {
        let option = {
            url: api.souhu.videoInfo + id + ".json?site=2&api_key=695fe827ffeb7d74260a813025970bd5&aid=0"
        }
        request.get( option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,err,"responseErr","info")
            //     return callback(err)
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取list接口无返回内容","resultErr","info")
            //     return callback()
            // }
            // if(result.statusCode != 200){
            //     logger.error(`${id}状态码错误`)
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,`搜狐获取list接口${id}状态码错误`,"responseErr","info")
            //     logger.debug('code:',result.statusCode)
            //     return callback(true)
            // }
            storaging.judgeRes (this.core,"souhu",option.url,task.id,err,result,callback,"info")
            if(!result){
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取list接口json数据解析失败","doWithResErr","info")
                logger.debug('info',result)
                return callback(e)
            }
            if(result.status != 200){
                logger.error(`${result.statusText},${result.request}`)
                storaging.errStoraging(this.core,'souhu',option.url,task.id,`搜狐获取list接口${id}状态码错误`,"responseErr","info")
                return callback(result.status)
            }
            //logger.debug('debug info message:',result)
            let backData  = result.data
            let data = {
                title: backData.video_name,
                desc: backData.video_desc,
                time: Math.round(backData.create_time / 1000),
                play: backData.play_count,
                type : backData.first_cate_name || null,
                tag : this._tag(backData.keyword),
                seconds : backData.total_duration,
                picurl : this._picUrl(backData)
            }
            storaging.succStorage(this.core,"souhu",option.url,"info")
            callback(null,data)
        })
    }
    getDigg ( task, id, callback ) {
        let option = {
                url: api.souhu.digg + id + "&_=" + (new Date()).getTime()
            }
        request.get(option, (err,back) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,err,"responseErr","digg")
            //     return callback(err)
            // }
            // if(!back){
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取digg接口无返回内容","resultErr","digg")
            //     return callback()
            // }
            // if(back.statusCode != 200){
            //     logger.error(`${id} getDigg状态码错误`)
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,`搜狐获取digg接口${id}状态码错误`,"responseErr","digg")
            //     logger.debug('code:',back.statusCode)
            //     return callback(true)
            // }
            storaging.judgeRes (this.core,"souhu",option.url,task.id,err,back,callback,"digg")
            if(!back){
                return
            }
            let backInfo = eval(back.body),
                data = {
                    up: backInfo.upCount,
                    down: backInfo.downCount
                }
            storaging.succStorage(this.core,"souhu",option.url,"digg")
            callback(null,data)
        })
    }
    getCommentNum ( task, id, callback ) {
        let option = {
            url: api.souhu.comment + id
        }
        request.get( option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,err,"responseErr","commentNum")
            //     return callback(err)
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取commentNum接口无返回内容","resultErr","commentNum")
            //     return callback()
            // }
            // if(result.statusCode != 200){
            //     logger.error(`${id} getDigg状态码错误`)
            //     storaging.errStoraging(this.core,'souhu',option.url,task.id,`搜狐获取commentNum接口${id}状态码错误`,"responseErr","commentNum")
            //     logger.debug('code:',result.statusCode)
            //     return callback(true)
            // }
            storaging.judgeRes (this.core,"souhu",option.url,task.id,err,result,callback,"commentNum")
            if(!result){
                return 
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'souhu',option.url,task.id,"搜狐获取commentNum接口json数据解析失败","doWithResErr","commentNum")
                return
            }
            storaging.succStorage(this.core,"souhu",option.url,"commentNum")
            callback(null,result.cmt_sum)
        })
    }
    _tag ( raw ){
        if(!raw){
            return ''
        }
        raw = raw.split(' ')
        let _tagArr = []
        if(raw.length != 0){
            for(let i in raw){
                _tagArr.push(raw[i])
            }
            return _tagArr.join(',')
        }
        return ''
    }
    _picUrl ( raw ){
        if(raw.hor_w16_pic){
            return raw.hor_w16_pic
        }
        if(raw.hor_w8_pic){
            return raw.hor_w8_pic
        }
        if(raw.hor_high_pic){
            return raw.hor_high_pic
        }
        if(raw.bgCover169){
            return raw.bgCover169
        }
        if(raw.hor_big_pic){
            return raw.hor_big_pic
        }
    }
}
module.exports = souhuDealWith