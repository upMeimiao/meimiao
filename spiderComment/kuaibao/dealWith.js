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
		this.commentId( task, (err,result) => {
			if(result == 'add_0'){
				return callback(null)
			}
			callback(null,task.cNum,task.lastId,task.lastTime,task.addCount)
		})
	}
	commentId( task, callback ){
		let option = {
			url: this.settings.kuaibao.commentId + task.aid
		},
		comment_id
		request.get( logger, option, (err, result) => {
			if(err){
				logger.debug('天天快报请求评论Id失败')
				return this.commentId(task,callback)
			}
			result = result.body.replace(/[\s\n\r]/g,'')
			comment_id = result.match(/commentId="\d*/).toString().replace('commentId="','')
			task.commentId = comment_id
			this.totalPage( task, (err, result) => {
				callback(null,result)
			})
		})
	}
	totalPage( task, callback ){
		let option   = {
			url: 'http://coral.qq.com/article/' + task.commentId + '/comment?commentid=&reqnum=20'
		}, 
			total = 0
		request.get( logger, option, (err, result) => {
			if(err){
				logger.debug('天天快报评论总量请求失败',err)
				return this.totalPage(task,callback)
			}
			try{
				result = JSON.parse(result.body)
			} catch(e) {
				logger.debug('天天快报评论数据解析失败')
				logger.info(result)
				return this.totalPage(task,callback)
			}
			task.cNum = result.data.total
            if((task.cNum - task.commentNum) <= 0){
                return callback(null,'add_0')
            }
            if(task.commentNum <= 0){
                total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20)
            }else{
                total = (task.cNum - task.commentNum)
                total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20)
            }
			task.lastTime = result.data.commentid[0].time
			task.lastId = result.data.commentid[0].id
			task.addCount = task.cNum - task.commentNum
			this.commentList( task, total, (err) => {
				callback(null,'')
			})
		})
	}
	commentList( task, total, callback ){
		let page  = 1,
			commentId = '',
            option
		async.whilst(
			() => {
				return page <= total
			},
			(cb) => {
				option = {
					url: 'http://coral.qq.com/article/' + task.commentId + '/comment?commentid=' + commentId + '&reqnum=20'
				}
				request.get( logger, option, (err, result) => {
					if(err){
						logger.debug('天天快报评论列表请求失败',err)
						return cb()
					}
					try{
						result = JSON.parse(result.body)
					} catch(e) {
						logger.debug('天天快报评论数据解析失败')
						logger.info(result)
						return cb()
					}
					this.deal( task, result.data.commentid, (err) => {
						if(task.isEnd){
							return callback()
						}
						page++
						commentId = result.data.last
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
				if(task.commentId == comments[index].id || task.commentTime >= comments[index].time){
					task.isEnd = true
					return callback()
				}
				comment = {
					cid: comments[index].id,
					content: Utils.stringHandling(comments[index].content),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
					ctime: comments[index].time,
					support: comments[index].up,
					c_user: {
						uid: comments[index].userid,
						uname: comments[index].userinfo.nick,
						uavatar: comments[index].userinfo.head
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
