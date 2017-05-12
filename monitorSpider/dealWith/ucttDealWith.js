/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require('../../lib/request.js')
const jsonp = function(data){
    return data
}
let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('DealWith instantiation ...')
    }
    uctt ( task, callback ) {
        task.total = 0
        task.page = 0
        this.getList( task, ( err,result ) => {
            if(err){
                return callback( err )
            }
            callback( err,result )
        })
    }
    getList ( task, callback ) {
        let _pos = '',
            page = 3
        async.whilst(
            () => {
                return task.page < page
            },
            (cb) => {
                let option= {
                        url: 'http://napi.uc.cn/3/classes/article/categories/wemedia/lists/'+ task.id +'?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_size=5&_max_pos='+ _pos +'&uc_param_str=frdnsnpfvecpntnwprdsssnikt'
                    }
                //logger.debug(option.url)
                request.get( logger, option, ( err, result ) => {
                    this.storaging.totalStorage ("uctt",option.url,"list")
                    if (err) {
                        let errType
                        if(err.code){
                            if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                                errType = "timeoutErr"
                            } else{
                                errType = "responseErr"
                            }
                        } else{
                            errType = "responseErr"
                        }
                        //logger.error(errType)
                        this.storaging.errStoraging("uctt",option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('uctt',option.url,task.id,"UC头条获取list接口状态码错误","statusErr","list")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('uctt',option.url,task.id,"UC头条获取list接口json数据解析失败","doWithResErr","list")
                        return cb()
                    }
                    let length = result.data.length
                    task.total += length
                    if(length <= 0){
                        page = 0
                        return cb() 
                    }
                    this.deal( task, result.data, () => {
                        page++
                        if(result.length <= 0){
                            page = 0
                        }
                        task.page++
                        _pos = result.data[length-1]._pos
                        cb()
                    })
                    
                })
            },
            (err,result) => {
                logger.debug('没有数据了')
                callback()
            }
        )
            
    }

    deal ( task, info, callback ) {
        let index = 0,
            length = info.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                //logger.debug('++++')
                this.getInfo( task, info[index], () => {
                    index++;
                    cb()
                })
            },
            ( err, data ) => {
                callback()
            }
        )
    }

    getInfo( task, data, callback ){
        let aid = data.xss_item_id,
            _id = data._id
        //logger.debug(data)               
        async.waterfall(
            [
                (cb) => {
                    this.getVidInfo( task, _id, aid, ( err, result ) => {
                        cb(null,result)
                    })
                }
            ],
            (err,result) => {
                if(result == '没有数据'||!result){
                    logger.debug('没有数据')
                    return callback()
                }
                let media = {
                    bid: task.id,
                    author: task.name,
                    platform: task.p,
                    aid: result.id,
                    title: data.title.substr(0,100).replace(/"/g,''),
                    play_num: result.view_cnt,
                    comment_num: result.descData.comment_num,
                    support: data._incrs.liketimes,
                    v_img: data.cover_url,
                    class: data.category,
                    v_url: data.other_info == undefined ? result.url : data.other_info.video_playurl,
                    a_create_time: moment(data._created_at).unix(),
                    tag: this._tags(result.tags),
                    desc: result.descData.desc.substr(0,100).replace(/"/g,''),
                    long_t: result.videos[0] == undefined ? result.content_length/1000 : result.videos[0].length/1000
                }
                //logger.debug(media)
                if(!media.support){
                    delete media.support
                }
                if(!media.play_num){
                    return
                }
                // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
                //     if(err){
                //         logger.debug("读取redis出错")
                //         return
                //     }
                //     if(result > media.play_num){
                //         this.storaging.errStoraging('uctt',"",task.id,`UC头条视频播放量减少`,"playNumErr","info",media.aid,`${result}/${media.play_num}`)
                //     }
                //     this.storaging.sendDb(media/*,task.id,"info"*/)
                // })
                this.storaging.playNumStorage(media,"info")
                callback()
            }
        )        
    }

    getVidInfo( task, _id, aid, callback ){
        let option = {
            url : 'http://m.uczzd.cn/ucnews/video?app=ucnews-iflow&fr=iphone&aid='+aid
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("uctt",option.url,"info")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                this.storaging.errStoraging('uctt',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('uctt',option.url,task.id,`UC头条获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(result.statusCode)
            }
            try{
                result = result.body.replace(/[\r\n]/g, '')
                let $ = cheerio.load(result)
                if($('p.info').text() == '文章不存在'){
                    return callback(null,'没有数据')
                }
                result = result.replace(/[\s]/g,'')
                let startIndex = result.indexOf('xissJsonData='),
                    endIndex = result.indexOf(';varzzdReadId')
                result = result.substring(startIndex+13,endIndex)
                //result = result.replace(/var zzdReadId = \'\w*\';/,'').replace(/;/g,'')
                result = JSON.parse(result)
            }catch (e){
                this.storaging.errStoraging('uctt',option.url,task.id,"UC头条获取info接口json数据解析失败","doWithResErr","info")
                return callback(null,'没有数据')
            }
            this.getCommentNum(task,_id,result.id,(err,data) => {
                if(err){
                    return
                }
                result.descData = data
                if(!result.descData.comment_num){
                    result.descData.comment_num = ''
                }else if(!result.descData.desc){
                    result.descData.desc = ''
                }
                callback(null,result)
            })
        })
    }
    getCommentNum( task, _id, id, callback ){
        let options      = {},
            num          = null
        options.url = 'http://m.uczzd.cn/iflow/api/v2/cmt/article/'+id+'/comments/byhot?count=10&fr=iphone&dn=11341561814-acaf3ab1&hotValue='
        //logger.debug(options.url)
        request.get( logger, options, (err,data) => {
            this.storaging.totalStorage ("uctt",options.url,"commentNum")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("uctt",options.url,task.id,err.code || "error",errType,"commentNum")
                return this.getCommentNum( task, _id, id, callback )
            }
            try{
                data = JSON.parse(data.body)
            }catch(e){
                logger.debug('UC数据解析失败')
                this.storaging.errStoraging('uctt',options.url,task.id,"UC头条获取commentNum接口json数据解析失败","doWithResErr","commentNum")
                return this.getCommentNum( task, _id, id, callback )
            }
            num = data.data.comment_cnt
            this.getDesc(task,_id,(err,result) => {
                if(err){
                    return callback(err)
                }
                let res = {
                    comment_num: num ? num : '',
                    desc: result.data ? (result.data.sub_title ? result.data.sub_title : '') : ''
                }
                callback(null,res)
            })
        })
           
    }
    getDesc( task, _id, callback ){
        let option = {
            url : 'http://napi.uc.cn/3/classes/article/objects/'+_id+'?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_ch=article'
        }
        //logger.debug(option.url)
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("uctt",option.url,"desc")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                this.storaging.errStoraging('uctt',option.url,task.id,err.code || "error",errType,"desc")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('uctt',option.url,task.id,`UC头条获取desc接口状态码错误${result.statusCode}`,"statusErr","desc")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                this.storaging.errStoraging('uctt',option.url,task.id,"UC头条获取desc接口json数据解析失败","doWithResErr","desc")
                return callback(e)
            }
            callback(null,result)
        })
    }
    _tags(raw){
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
}
module.exports = dealWith