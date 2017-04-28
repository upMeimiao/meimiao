/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request')
const Utils = require('../../lib/spiderUtils')
const async = require('async')
const cheerio = require('cheerio')
const URL = require('url')
const md5 = require('js-md5')

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
                    this.getHot(task,(err) => {
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
                callback()
            }
        )
    }
    getHot( task, callback ){
        let page  = 1,
            option = {
                url: this.settings.neihan + `${task.aid}&offset=0`
            }
            request.get( logger, option, (err, result) => {
                if(err){
                    logger.debug('内涵评论列表请求失败',err)
                    return callback(err)
                }
                try{
                    result = JSON.parse(result.body)
                } catch(e) {
                    logger.debug('内涵评论数据解析失败')
                    logger.info(result)
                    return callback(e)
                }
                this.deal( task, result.data.top_comments, (err) => {
                   callback()
                })
            })
    }
    getTime( task, callback ){
        let page  = 1,
            total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
            option = {},
            offset = 0
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.neihan + `${task.aid}&offset=${offset}`
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('内涵评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('内涵评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.data.recent_comments.length <= 0){
                        page += total
                        return cb()
                    }
                    this.deal( task, result.data.recent_comments, (err) => {
                        page++
                        offset+=20
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
                    cid: comments[index].comment_id,
                    content: Utils.stringHandling(comments[index].text),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: comments[index].create_time,
                    support: comments[index].digg_count,
                    step: comments[index].bury_count,
                    c_user: {
                        uid: comments[index].user_id,
                        uname: comments[index].user_name,
                        uavatar: comments[index].avatar_url
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