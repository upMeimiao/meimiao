/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request')
const Utils = require('../../lib/spiderUtils')
const async = require('async')
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
                    this.getHot( task, (err) => {
                        cb(null,'热门评论数据完成')
                    })
                },
                time: (cb) => {
                    this.getTime( task, (err) => {
                        cb(null,'最新评论数据完成')
                    })
                }
            },
            (err, result) => {
                logger.debug('result: ',result)
                callback(null,task.hostTotal,task.timeTotal)
            }
        )
    }
    getHot( task, callback ) {
        let page  = 0,
            total  = Number(this.settings.commentTotal) % 10 == 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
            option = {}
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option.url = this.settings.baofeng.hot + task.bid + '&page=' + page
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('暴风网评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('暴风网评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.data.length <= 0){
                        page += total
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
    getTime( task, callback ) {
        let page  = 1,
            total  = Number(this.settings.commentTotal) % 10 == 0 ? Number(this.settings.commentTotal) / 10 : Math.ceil(Number(this.settings.commentTotal) / 10),
            option = {}
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option.url = this.settings.baofeng.time + task.bid + '&page=' + page
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('暴风网评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('暴风网评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.data.length <= 0){
                        page += total
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
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                comment = {
                    cid: comments[index].id,
                    content: Utils.stringHandling(comments[index].yestxt),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: comments[index].addtime,
                    c_user: {
                        uid: comments[index].uid,
                        uname: comments[index].username,
                        uavatar: comments[index].faceimg
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