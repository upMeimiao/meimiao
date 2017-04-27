/**
 * Created by dell on 2017/3/9.
 */
const request = require('../../lib/request')
const Utils = require('../../lib/spiderUtils')
const async = require('async')
const cheerio = require('cheerio')
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
        this.getTime(task,(err) => {
            callback()
        })
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
                    url: this.settings.ku6 + task.aid + '&pn=' + page
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('ku6评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('ku6评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.data.list.length <= 0){
                        page += total
                        return cb()
                    }
                    this.deal( task, result.data.list, (err) => {
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
                this.getAvatar( comments[index].commentAuthorId, (err, result) => {
                    comment = {
                        cid: comments[index].id,
                        content: Utils.stringHandling(comments[index].commentContent),
                        platform: task.p,
                        bid: task.bid,
                        aid: task.aid,
                        ctime: comments[index].commentCtime.toString().substring(0,10),
                        support: comments[index].commentCount,
                        c_user: {
                            uid: comments[index].commentAuthorId,
                            uname: comments[index].commentAuthor,
                            uavatar: result
                        }
                    }
                    Utils.saveCache(this.core.cache_db,'comment_update_cache',comment)
                    index++
                    cb()
                })
            },
            (err, result) => {
                callback()
            }
        )
    }
    getAvatar( uid, callback ){
        let option = {
            url: 'http://boke.ku6.com/' + uid
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('用户主页请求失败')
            }
            let $ = cheerio.load(result.body),
                avatar = $('a.headPhoto>img').attr('src')
            callback(null,avatar)
        })
    }
}
module.exports = hostTime