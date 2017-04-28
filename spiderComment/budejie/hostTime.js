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
        this.getTime( task, (err) => {
            callback(null,0,0)
        })
    }
    getTime( task, callback ){
        let page  = 1,
            total = Number(this.settings.commentTotal) % 5 == 0 ? Number(this.settings.commentTotal) / 5 : Math.ceil(Number(this.settings.commentTotal) / 5),
            option = {}
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.budejie + `${task.aid}&page=${page}`
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('不得姐评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('不得姐评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(!result || !result.data){
                        page += total
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
            comment,
            time
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                time = new Date(comments[index].ctime)
                time = moment(time).format('X')
                if(!comments[index].content){
                    index++
                    return cb()
                }
                comment = {
                    cid: comments[index].id,
                    content: Utils.stringHandling(comments[index].content),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: time,
                    support: comments[index].like_count,
                    c_user: {
                        uid: comments[index].user.id,
                        uname: comments[index].user.username,
                        uavatar: comments[index].user.profile_image
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