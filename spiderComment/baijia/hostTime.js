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
        this.getTime( task, (err) => {
            callback(null,task.hostTotal,task.timeTotal)
        })
    }
    getTime( task, callback ) {
        let page  = 0,
            cycle = true,
            option = {}
        async.whilst(
            () => {
                return cycle
            },
            (cb) => {
                option.url = this.settings.baijia + task.aid + '&pn=' + page
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('百家号评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = eval(result.body)
                    } catch(e) {
                        logger.debug('百家号评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.data.reply_list.length <= 0){
                        cycle = false
                        return cb()
                    }
                    this.deal( task, result.data.reply_list, (err) => {
                        if(task.timeTotal >= Number(this.settings.commentTotal)){
                            return callback()
                        }
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
                    cid: comments[index].reply_id,
                    content: Utils.stringHandling(comments[index].reply_content.content),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: comments[index].time,
                    support: '',
                    step: '',
                    c_user: {
                        uname: comments[index].uname,
                        uavatar: comments[index].avatar
                    }
                }
                if(task.timeTotal >= Number(this.settings.commentTotal)){
                    return callback()
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