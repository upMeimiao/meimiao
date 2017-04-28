/**
* Created by junhao on 2017/2/08.
*/
const request = require('../../lib/request')
const async = require('async')
const Utils = require('../../lib/spiderUtils')

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
		this.totalPage( task, (err, result) => {
			if(result == 'add_0'){
				return callback(null)
			}
			callback(null,task.cNum,task.lastId,task.lastTime,task.addCount)
		})
	}
	totalPage( task, callback ){
		let option   = {
			url: this.settings.le.list + `${task.aid}&page=1`
		}, 
			total    = 0
		request.get( logger, option, (err, result) => {
			if(err){
				logger.debug('乐视评论总量请求失败',err)
				return this.totalPage(task,callback)
			}
			try{
				result = JSON.parse(result.body)
			} catch(e) {
				logger.debug('乐视评论数据解析失败')
				logger.info(result)
				return this.totalPage(task,callback)
			}
            task.cNum = result.total
            if((task.cNum - task.commentNum) <= 0){
                return callback(null,'add_0')
            }
            if(task.commentNum <= 0){
                total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20)
            }else{
                total = (task.cNum - task.commentNum)
                total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20)
            }
			task.lastId = result.data[0]._id
			task.lastTime = result.data[0].ctime
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
					url: this.settings.le.list + `${task.aid}&page=${page}`
				}
				request.get( logger, option, (err, result) => {
					if(err){
						logger.debug('乐视评论列表请求失败',err)
						return cb()
					}
					try{
						result = JSON.parse(result.body)
					} catch(e) {
						logger.debug('乐视评论数据解析失败')
						logger.info(result)
						return cb()
					}
					this.deal( task, result.data, (err) => {
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
		let length = comments.length,
			index  = 0,
            comment
		async.whilst(
			() => {
				return index < length
			},
			(cb) => {
				if(task.commentId == comments[index]._id || task.commentTime >= comments[index].ctime){
					task.isEnd = true
					logger.debug('---新加评论结束---')
					return callback()
				}
				comment = {
					cid: comments[index]._id,
					content: Utils.stringHandling(comments[index].content),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
					ctime: comments[index].ctime,
					support: comments[index].like,
					reply: comments[index].replynum,
					c_user: {
						uid: comments[index].user.uid,
						uname: comments[index].user.username,
						uavatar: comments[index].user.photo
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
