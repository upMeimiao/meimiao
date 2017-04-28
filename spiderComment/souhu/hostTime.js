/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request')
const Utils = require('../../lib/spiderUtils')
const async = require('async')
const cheerio = require('cheerio')
const URL = require('url')
const md5 = require('js-md5')
const  _Callback = function (data) {
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
        this.totalPage(task,(err) => {
            callback()
        })
    }
    totalPage( task, callback ){
        let option   = {
                url: this.settings.souhu.topicId + 'http://my.tv.sohu.com/pl/'+task.bid+'/'+task.aid+'.shtml&topic_source_id=bk'+task.aid
            },
            total = 0
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('bili评论总量请求失败',err)
                return this.totalPage(task,callback)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e) {
                logger.debug('bili评论数据解析失败')
                logger.info(result)
                return this.totalPage(task,callback)
            }
            task.topicId = result.topic_id
            this.getTime( task, (err) => {
                callback()
            })
        })
    }
    getTime( task, callback ){
        let page  = 0,
            total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
            option = {}
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.souhu.list + `${task.topicId}&page_no=${page}&_` + new Date().getTime()
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('搜狐评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('搜狐评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.comments.length <= 0){
                        page += total;
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
            comment
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
                    step: comments[index].floor_count,
                    reply: comments[index].reply_count,
                    c_user: {
                        uid: comments[index].passport.profile_url.match(/user\/\d*/).toString().replace('user/',''),
                        uname: comments[index].passport.nickname,
                        uavatar: comments[index].passport.img_url
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