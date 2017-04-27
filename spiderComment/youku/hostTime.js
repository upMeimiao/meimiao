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
        this.getCommentId( task, (err) => {
            callback()
        })
    }
    getCommentId( task, callback ){
        let option = {
            url: `${this.settings.youku.commentId}${task.aid}&time=${new Date().getTime()}`
        }
        request.get(logger, option, (err, result) => {
            if(err){
                logger.debug('优酷的评论id请求失败')
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.debug('优酷评论Id数据解析失败')
                return callback(e)
            }
            task.commentId = result.data.id
            async.parallel(
                {
                    /*hot: (cb) => {
                        this.getHot( task, (err) => {
                            cb(null,'热门评论完成')
                        })
                    },*/
                    time: (cb) => {
                        this.getTime( task, (err) => {
                            cb(null,'最新评论完成')
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
                option.url = ``
            },
            (err, result) => {

            }
        )
    }
    getTime( task, callback ){
        let page  = 1,
            total = Number(this.settings.commentTotal) % 100 == 0 ? Number(this.settings.commentTotal) / 100 : Math.ceil(Number(this.settings.commentTotal) / 100),
            option,
            lastCommentId = '';
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.youku.list + `${task.aid}&page=${page}&count=100`
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('优酷评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body.replace(/[\n\r]/g,''))
                    } catch(e) {
                        logger.debug('优酷评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(result.comments.length <= 0){
                        page += total
                        return cb()
                    }
                    this.deal( task, result.comments, ( err ) => {
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
            time,
            comment;
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                time = new Date(comments[index].published)
                comment = {
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    cid: comments[index].id,
                    content: Utils.stringHandling(comments[index].content),
                    ctime: moment(time).format('X'),
                    support: '',
                    step: '',
                    reply: '',
                    c_user: {
                        uid: comments[index].user ? comments[index].user.id : '',
                        uname: comments[index].user ? comments[index].user.name : ''
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