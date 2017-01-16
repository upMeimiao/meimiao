/**
 * Created by junhao on 16/6/21.
 */

const async = require( 'async' )
const cheerio = require('cheerio')
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
        this.getTheAlbum(task,(err) => {
            if(err){
                logger.debug('最后返回的错误信息',err)
                return callback(err)
            }
            callback(null,task.total)
        })
    }
    
    getTheAlbum( task, callback ){
        let bidstr = task.id.toString(),
            bid = bidstr.substring(bidstr.length-2,bidstr.length),
            option = {
            url : 'http://www.baofeng.com/detail/'+bid+'/detail-'+task.id+'.html'
        }

        request.get( logger, option, (err,result) => {

            if(err){
                logger.debug('专辑视频信息请求失败',err)
                return callback(err)
            }
            let $ = cheerio.load(result.body),
                aid = $('div.enc-episodes-detail').attr('m_aid')

            this.getVidList( task, aid, (err) => {
                if(err){
                    return callback(err)
                }
                callback()
            })
        })
    }
    
    getVidList( task, aid, callback ){
        let option = {
            url: 'http://minfo.baofeng.net/asp_c/13/124/'+aid+'-n-100-r-50-s-1-p-1.json?_random=false'
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('视频列表请求失败',err)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('视频列表解析失败',err)
                return callback(e)
            }
            task.total = result.album_info.videos_num
            let videoList = result.video_list,
                length = videoList.length
            this.deal( task, videoList, length, () => {
                callback()
            })
        })
    }
    deal( task, user, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getAllInfo( task, index, user[index], () => {
                    index++
                    cb()
                })
            },
            (err,data) => {
                callback()
            }
        )
    }
    getAllInfo( task, index, video, callback ){
        async.parallel(
            [
                (cb) => {
                    this.support( video.vid, (err, result) => {
                        cb(null,result)
                    })
                },
                (cb) => {
                    this.getDesc( task.id, index, (err, result) => {
                        cb(null,result)
                    })
                }
            ],
            (err,result) => {
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.vid,
                    title: video.v_sub_title.substr(0,100).replace(/"/g,''),
                    a_create_time: video.update_time.substring(0,10),
                    long_t: video.video_time/1000,
                    support: result[0].u,
                    step: result[0].d,
                    desc: result[1].desc.substr(0,100).replace(/"/g,''),
                    type: result[1].types
                }

                this.sendCache(media)
                callback()
            }
        )
    }
    getDesc( bid, index, callback ){
        index++
        let option = {
            url : 'http://m.baofeng.com/play/73/play-786073-drama-'+ index +'.html'
        }
        request.get( logger, option, (err, result) => {
            if(err) {
                logger.debug('视频的描述')
                return callback(null,{type:'',desc:''})
            }
            let $ = cheerio.load(result.body),
                type = $('div.details-info-right a').text(),
                desc = $('div.play-details-words').text().replace('简介：','').substring(0,100),
                res = {
                    type: type,
                    desc: desc
                }
            callback(null,res)
        })
    }
    support( vid, callback ){
        let option = {
            url : 'http://hd.baofeng.com/api/getud?wid=13&vid='+vid
        }
        request.get( logger, option, (err, result) => {
            if(err) {
                logger.debug('视频的踩、顶请求失败',err)
                return callback(null,{u:'',d:''})
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('顶、踩数据解析失败',e)
                return callback(null,{u:'',d:''})
            }
            callback(null,result.data)
        })
    }
    sendCache (media){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`暴风影音 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith