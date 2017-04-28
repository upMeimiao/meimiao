/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request')
const async = require('async')
const Utils = require('../../lib/spiderUtils')
const md5 = require('js-md5')

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
		this.total( task, (err, result) => {
			if(result == 'add_0'){
				return callback(null)
			}
			callback(null,task.cNum,task.lastId,task.lastTime,task.addCount)
		})
	}
	total( task, callback ){
		let option = {
			url: `http://api1.fun.tv/comment/display/gallery/${task.bid}?pg=1&isajax=1&dtime=${new Date().getTime()}`
		},
			total = 0
		request.get( logger, option, (err, result) => {
			if(err){
				logger.debug('风行网的评论总数请求失败')
				return this.total(task,callback)
			}
			try{
				result = JSON.parse(result.body)
			}catch(e){
				logger.debug('风行网数据解析失败')
				logger.info(result)
				return this.total(task,callback)
			}
			task.cNum = result.data.total_num
            if((task.cNum - task.commentNum) <= 0){
                return callback(null,'add_0')
            }
            if(task.commentNum <= 0){
                total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20)
            }else{
                total = (task.cNum - task.commentNum)
                total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20)
            }
			let comment = result.data.comment[0],
				cid = md5(task.bid + comment.user_id + comment.time)
			task.lastTime = comment.time
			task.lastId = cid
			task.addCount = task.cNum - task.commentNum
			this.commentList( task, total, (err) => {
				callback()
			})
		})
	}
	commentList( task, total, callback ){
		let page  = 1,
			option
		async.whilst(
			() => {
				return page <= total
			},
			(cb) => {
				option = {
					url: `http://api1.fun.tv/comment/display/gallery/${task.bid}?pg=${page}&isajax=1&dtime=${new Date().getTime()}`
				}
				request.get( logger, option, (err, result) => {
					if(err){
						logger.debug('风行网评论列表请求失败',err)
						return cb()
					}
					try{
						result = JSON.parse(result.body)
					} catch(e) {
						logger.debug('风行网评论数据解析失败')
						logger.info(result)
						return cb()
					}
					this.deal( task, result.data.comment, (err) => {
						if(task.isEnd){
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
			cid,
			comment
		async.whilst(
			() => {
				return index < length
			},
			(cb) => {
				cid = md5(task.bid + comments[index].user_id + comments[index].time)
				if(task.commentId == cid || task.commentTime >= comments[index].time){
					task.isEnd = true
					return callback()
				}
				comment = {
					cid: cid,
					content: Utils.stringHandling(comments[index].content),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
					ctime: comments[index].time,
					support: comments[index].upCount,
					c_user: {
						uid: comments[index].user_id,
						uname: comments[index].nick_name,
						uavatar: comments[index].user_icon.orig
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
