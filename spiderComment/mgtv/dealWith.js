/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request')
const async = require('async')
const Utils = require('../../lib/spiderUtils')
const cheerio = require('cheerio')
const URL = require('url')

let logger
class dealWith {
	constructor(spiderCore){
		this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
	}
	todo( task, callback ){
		task.cNum  = 0      //评论的数量
		task.lastId   = 0      //第一页评论的第一个评论Id
		task.lastTime = 0      //第一页评论的第一个评论时间
		task.isEnd = false  //判断当前评论跟库里返回的评论是否一致
		task.addCount   = 0      //新增的评论数
		this.commentList( task, (err, result) => {
			if(result == 'add_0'){
				return callback(null)
			}
			callback(null,task.cNum,task.lastId,task.lastTime,task.addCount)
		})
	}
	commentList( task, callback ){
		let page  = 1,
			cycle = true,
            option
		async.whilst(
			() => {
				return cycle
			},
			(cb) => {
				option = {
					url: this.settings.mgtv + task.aid + '&pageCount=' + page
				}
				request.get( logger, option, (err, result) => {
					if(err){
						logger.debug('芒果评论列表请求失败',err)
						return cb()
					}
					try{
						result = JSON.parse(result.body)
					} catch(e) {
						logger.debug('芒果评论数据解析失败')
						logger.info(result)
						return cb()
					}
					task.cNum += result.data.length
					if(!task.lastId){
						task.lastId = result.data[0].commentId
					}
					if(result.data.length <= 0){
						cycle = false
						return cb()
					}
					this.deal( task, result.data, (err) => {
						if(task.isEnd){
							return callback(null,'add_0')
						}
						page++
						cb()
					})
				})
			},
			(err, result) => {
				task.addCount = task.cNum - task.commentNum
				callback()
			}
		)
	}
	deal( task, comments, callback ){
		let length   = comments.length,
			index    = 0
		async.whilst(
			() => {
				return index < length
			},
			(cb) => {
				if(task.commentId == comments[index].commentId){
					task.isEnd = true
					task.cNum = task.commentNum + (index == 0 ? index : index +1)
					task.addCount = task.cNum - task.commentNum
					return callback()
				}
				let comment = {
					cid: comments[index].commentId,
					content: Utils.stringHandling(comments[index].comment),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
					c_user: {
						uname: comments[index].commentBy,
                        uavatar: comments[index].commentAvatar
					}
				}
                Utils.commentCache(this.core.cache_db,comment)
				//Utils.saveCache(this.core.cache_db,'comment_cache',comment)
				index++
				cb()
			},
			(err, result) => {
				callback()
			}
		)
	}
	
}

module.exports = dealWith
