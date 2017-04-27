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
        async.parallel(
            {
                hot: (cb) => {
                    this.getHot(task,(err) =>{
                        cb(null,'热门评论数据完成')
                    })
                },
                time: (cb) => {
                    this.getTime(task,(err) => {
                        cb(null,'最新评论数据完成')
                    })
                }
            },
            (err, result) => {
                logger.debug('result: ',result)
                callback()
            }
        )
    }
    getHot( task, callback ){
        let page  = 1,
            total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
            option = {}
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.iqiyi.hot + `${task.aid}&tvid=${task.aid}&page=${page}`
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('爱奇艺评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('爱奇艺评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.data.comments.length <= 0){
                        page += total
                        return cb()
                    }
                    this.deal( task, result.data.comments, (err) => {
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
            option = {}
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.iqiyi.list + `${task.aid}&tvid=${task.aid}&page=${page}`
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('爱奇艺评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('爱奇艺评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.data.comments.length <= 0){
                        page += total
                        return cb()
                    }
                    this.deal( task, result.data.comments, (err) => {
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
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                comment = {
                    cid: comments[index].contentId,
                    content: Utils.stringHandling(comments[index].content),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: comments[index].addTime,
                    support: comments[index].counterList.likes,
                    step: comments[index].counterList.downs,
                    reply: comments[index].counterList.replies,
                    c_user: {
                        uid: comments[index].userInfo.uid,
                        uname: comments[index].userInfo.uname,
                        uavatar:  comments[index].userInfo.icon
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