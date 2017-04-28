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
        this.getSid( task, (err) => {
            callback(null,0,0)
        })
    }
    getSid( task, callback ){
        let option = {
            url: this.settings.huashu.getSid + task.bid
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('华数的sid请求失败')
                return this.getSid(task,callback)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('华数的sid数据解析失败')
                logger.info(result.body)
                return this.getSid(task,callback)
            }
            this.total( task, result[1].aggData[0].aggRel.video_sid, (err, result) => {
                callback(null,result)
            })
        })
    }
    total( task, sid, callback ){
        let option = {
                url: this.settings.huashu.topicId + sid + `&_=${new Date().getTime()}`
            },
            total = 0
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('华数网的评论总数请求失败')
                return this.total(task,callback)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('华数网数据解析失败')
                logger.info(result)
                return this.total(task,callback)
            }
            task.topicId = result.topic_id
            async.parallel(
                {
                    /*hot: (cb) => {
                        this.deal(task, result.hots, (err) => {
                            cb(null,'热门评论数据完成')
                        })
                    },*/
                    time: (cb) => {
                        this.getTime( task, (err) => {
                            cb(null,'最新的评论数据完成')
                        })
                    }
                },
                (err, result) => {
                    logger.debug('result: ',result)
                    callback()
                }
            )
        })
    }
    getTime( task, callback ){
        let page  = 1,
            total = Number(this.settings.commentTotal) % 10 == 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
            option = {}
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.huashu.list + task.topicId + `&page_no=${page}&_=${new Date().getTime()}`
                }
                logger.debug(option.url)
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('华数网评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('华数网评论数据解析失败')
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
        let length   = comments.length,
            index    = 0,
            comment,
            time
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                comment = {
                    cid: comments[index].comment_id,
                    content: Utils.stringHandling(comments[index].content),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: comments[index].create_time / 1000,
                    support: comments[index].support_count,
                    reply: comments[index].reply_count,
                    step: comments[index].floor_count,
                    c_user: {
                        uid: comments[index].user_id,
                        uname: comments[index].passport.nickname,
                        uavatar: comments[index].passport.img_url
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