/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request')
const Utils = require('../../lib/spiderUtils')
const async = require('async')
const moment = require('moment')
const jsonp = function(data){
    return data
}

let logger
class hostTime{
    constructor (spiderCore) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = spiderCore.settings.logger
    }
    todo ( task, callback ) {
        task.hostTotal = 0
        task.timeTotal = 0
        this.getVid( task, (err) => {
            callback(null,0,0)
        })
    }
    getVid( task, callback ){
        let option = {
            url: 'http://v.ifeng.com/m/video_'+ task.aid +'.shtml'
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('Dom结构请求失败')
                return this.getVid(task,callback)
            }
            result= result.body.replace(/[\s\n\r]/g,'')
            let startIndex = result.indexOf('videoinfo={'),
                endIndex = result.indexOf(',"videoLargePoster"'),
                data = '{'+result.substring(startIndex+11,endIndex)+'}',
                typeNum = null;
            if(endIndex !== 1){
                endIndex =  result.indexOf(';varcolumnName')
                data = result.substring(startIndex+10,endIndex)
            }
            if(startIndex !== 1){
                startIndex = result.indexOf('varvideoinfo=');
                endIndex = result.indexOf(';varcolumnName=');
                data = result.substring(startIndex+13,endIndex).replace(/[\s\n\r]/g,'');
            }
            try{
                if(typeNum === 1){
                    data = data.replace(',"video','}')
                }
                data = JSON.parse(data)
            }catch(e){
                logger.debug('vid数据解析失败')
                logger.info(data)
                return this.getVid(task,callback)
            }
            if(data.id && data.id.length > 10){
                this.getTime( task, data.id, (err,result) => {
                    callback(null,result)
                })
            }else{
                data.vid = data.videoid ? data.videoid : data.vid
                this.getTime( task, data.vid, (err,result) => {
                    callback(null,result)
                })
            }
        })
    }
    getTime( task, vid, callback ){
        let page  = 1,
            total = Number(this.settings.commentTotal) % 10 == 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
            option = {}
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.ifeng + `${vid}&p=${page}`
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('凤凰评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('凤凰评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.comments.length <= 0){
                        page += total
                        return cb()
                    }
                    this.deal( task, result.comments, (err) => {
                        page++
                        cb()
                    })
                })
            },
            (err, result) => {
                callback()
            }
        )
    }
    deal( task, comments, callback ){
        let length   = comments.newest.length,
            index    = 0,
            comment
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                comment = {
                    cid: comments.newest[index].comment_id,
                    content: Utils.stringHandling(comments.newest[index].comment_contents),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: comments.newest[index].create_time,
                    c_user: {
                        uid: comments.newest[index].user_id,
                        uname: comments.newest[index].uname,
                        uavatar: comments.newest[index].userFace
                    }
                }
                Utils.saveCache(this.core.cache_db,'comment_update_cache',comment)
                index++
                cb()
            },
            (err, result) => {
                callback()
            }
        )
    }
}
module.exports = hostTime