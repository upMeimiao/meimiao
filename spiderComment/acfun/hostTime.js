/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request')
const Utils = require('../../lib/spiderUtils')
const async = require('async')
const moment = require('moment')

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
        this.getTime( task, (err) => {
            callback(null,task.hostTotal,task.timeTotal)
        })
    }
    getTime( task, callback ) {
        let cycle  = true,
             page   = 1,
            option = {},
            total = Number(this.settings.commentTotal) % 50 == 0 ? Number(this.settings.commentTotal) / 50 : Math.ceil(Number(this.settings.commentTotal) / 50)
        async.whilst(
            () => {
                return page < total
            },
            (cb) => {
                option.url = this.settings.acfun + `${task.aid}&currentPage=${page}`
                logger.debug(option.url)
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('acfun评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('acfun评论数据解析失败')
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
        let length   = comments.commentList.length,
            index    = 0,
            comment,
            commentData,
            time
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                commentData = comments.commentContentArr['c'+comments.commentList[index]]
                time = new Date(commentData.postDate)
                time = moment(time).format('X')
                comment = {
                    cid: commentData.cid,
                    content: Utils.stringHandling(commentData.content),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: time,
                    support: commentData.ups,
                    step: commentData.downs,
                    c_user: {
                        uid: commentData.userID,
                        uname: commentData.userName,
                        uavatar: commentData.userImg
                    }
                }
                task.timeTotal++
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