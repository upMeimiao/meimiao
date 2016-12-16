/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const EventProxy = require( 'eventproxy' )
const request = require( '../lib/request' )

let logger
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0
        task.page = 0
        task.event = new EventProxy()
        task.event.once('end', () => {
            callback(null,task.total)
        })
        this.getList( task, ( err ) => {
            if(err){
                return callback( err )
            }
            callback( null, task.total )
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
                request.get( logger, option, ( err, result ) => {
                    if (err) {
                        logger.error( '接口请求错误 : ', err )
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return
                    }
                    let length = result.data.length
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
        let aid = data.xss_item_id
        //logger.debug(data)               
        async.waterfall(
            [
                (cb) => {
                    this.getVidInfo( aid, ( err, result ) => {
                        cb(null,result)
                    })
                }
            ],
            (err,result) => {
                let media = {
                    bid: task.id,
                    author: data.other_info.video_filename,
                    platform: task.p,
                    aid: result.id,
                    title: data.title,
                    play_num: result.view_cnt,
                    comment_num: result.comment_num,
                    support: data._incrs.liketimes,
                    v_img: data.cover_url,
                    class: data.category,
                    v_url: data.other_info.video_playurl,
                    a_create_time: moment(data._created_at).unix(),
                    tag: result.tags,
                    desc: result.site_logo.desc,
                    long_t: result.videos[0].length/1000
                }
                //logger.debug(media.long_t+"|||"+media.title)
                this.sendCache( media )
                callback()
            }
        )        
    }

    getVidInfo( aid, callback ){
        let option = {
            url : 'http://m.uczzd.cn/ucnews/video?app=ucnews-iflow&fr=iphone&aid='+aid
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            if (err) {
                logger.error( '接口请求错误 : ', err )
            }
            try{
                result = result.body.replace(/[\r\n]/g, '')
                let $ = cheerio.load(result)
                result = $('script')[0].children[0].data.replace(/var STATIC_HOST = \'\/\/image\.uc\.cn\';/,'').replace(/var xissJsonData = /,'').replace(/;/,'')
                result = result.replace(/var zzdReadId = \'\w*\';/,'')
                result = JSON.parse(result)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                return
            }
            this.getCommentNum(result.id,(err,data) => {
                result.comment_num = data
                callback(null,result)
            })
        })
    }
    getCommentNum( id, callback ){
        let sign         = 1,
            page         = 2,
            options      = {},
            hotScore     = '',
            num          = null,
            contLength   = null
        async.whilst(
            () => {
                return sign < page
            },
            (cb) => {
                options.url = 'http://m.uczzd.cn/iflow/api/v2/cmt/article/'+id+'/comments/byhot?count=10&fr=iphone&dn=11341561814-acaf3ab1&hotValue='+hotScore
                //logger.debug(options.url)
                request.get( logger, options, (err,data) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return callback(err,{code:102,p:1})
                    }
                    try{
                        data = JSON.parse(data.body)
                    }catch(e){
                        logger.debug('UC数据解析失败')
                    }
                    contLength = data.data.comments.length
                    num += contLength
                    if(contLength <= 0 || contLength < 10){
                        sign++
                        page=0
                        return cb()
                    }else{
                        for(let comment in data.data.comments_map){
                            hotScore = data.data.comments_map[comment].hotScore
                        }
                        sign++
                        page++
                        return cb()
                    }
                })
            },
            (err,result) => {
                callback(null,num)
            }
        )
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            //logger.debug(`uc头条 ${media.aid} 加入缓存队列`)
        } )
    }
    
}
module.exports = dealWith