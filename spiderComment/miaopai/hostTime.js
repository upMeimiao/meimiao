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
        this.getTime(task,(err) => {
            callback()
        })
    }
    getTime( task, callback ){
        let page  = 1,
            total = Number(this.settings.commentTotal) % 20 == 0 ? Number(this.settings.commentTotal) / 20 : Math.ceil(Number(this.settings.commentTotal) / 20),
            option = {},
            commentId = '',
            $,
            comments
        async.whilst(
            () => {
                return page <= total
            },
            (cb) => {
                option = {
                    url: this.settings.miaopai + `${task.aid}&page=${page}`
                }
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('秒拍评论列表请求失败',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.debug('秒拍评论数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    $        = cheerio.load(result.html)
                    comments = $('div.vid_hid')
                    if(comments.length <= 0){
                        page += total
                        return cb()
                    }
                    this.deal( task, comments, (err) => {
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
            url,
            uid,
            content,
            cid
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                url = comments.eq(index).find('div.hid_con>a').attr('data-link')
                uid = URL.parse(url,true).query.suid
                content = comments.eq(index).find('p.hid_con_txt2').text()
                cid = md5(uid + content)
                comment = {
                    cid: cid,
                    content: Utils.stringHandling(content),
                    platform: task.p,
                    bid: task.bid,
                    aid: task.aid,
                    ctime: '',
                    support: '',
                    step: '',
                    c_user: {
                        uid: uid,
                        uname: comments.eq(index).find('p.hid_con_txt1>b>a').text(),
                        uavatar: comments.eq(index).find('div.hid_con>a').attr('data-url')
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