/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request')
const Utils = require('../../lib/spiderUtils')
const async = require('async')
const URL = require('url')
const  jsonp = function (data) {
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
        this.commentId(task, (err, result) => {
            callback()
        })
    }
    commentId( task, callback ){
        let option = {
            url: this.settings.tudou.commentId + task.aid
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('土豆的评论Id请求失败')
                return this.commentId(task,callback)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e) {
                logger.debug('土豆的id数据解析失败')
                logger.info(result)
                return this.commentId(task,callback)
            }
            task.commentId = result.result.vid
            async.parallel(
                {
                    hot: (cb) => {
                     this.getHot(task, (err, result) => {
                     cb(null,'热门评论数据完成')
                     })
                     },
                    time: (cb) => {
                        this.getTime(task, (err, result) => {
                            cb(null,'最新评论数据完成')
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
    getHot( task, callback ){
        let page  = 1,
            total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
            option
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.tudou.list + task.commentId + '&method=getHotCmt&page=' + page
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('土豆评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('土豆评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.data.length <= 0){
                        page += total;
                        return cb()
                    }
                    this.deal( task, result.data, (err) => {
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
    getTime( task, callback ){
        let page  = 1,
            total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
            option
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.tudou.list + task.commentId + '&method=getCmt&page=' + page
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('土豆评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('土豆评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.data.length <= 0){
                        page += total;
                        return cb()
                    }
                    this.deal( task, result.data, (err) => {
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
            comment
        logger.debug(length)
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                comment = {
                    cid: comments[index].commentId,
                    content: Utils.stringHandling(comments[index].content),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: comments[index].publish_time / 1000,
                    support: '',
                    c_user: {
                        uid: comments[index].userID,
                        uname: comments[index].username,
                        uavatar: comments[index].userpic
                    }
                };
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