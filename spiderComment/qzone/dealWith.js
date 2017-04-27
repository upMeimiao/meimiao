/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request')
const async = require('async')
const Utils = require('../../lib/spiderUtils')
const md5 = require('js-md5')
const _Callback = function(data){
	return data
}

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
			url: this.settings.qzone + task.bid + '&tid=' + task.aid + '&pos=0'
		},
			total = 0
		request.get( logger, option, (err, result) => {
			if(err){
				logger.debug('qzone的评论总数请求失败')
				return this.total(task,callback)
			}
			try{
				result = eval(result.body)
			}catch(e){
				logger.debug('qzone数据解析失败')
				logger.info(result)
				return this.total(task,callback)
			}
			task.cNum = result.cmtnum
            if((task.cNum - task.commentNum) <= 0){
                return callback(null,'add_0')
            }
            if(task.commentNum <= 0){
                total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20)
            }else{
                total = (task.cNum - task.commentNum)
                total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20)
            }
			let comment = result.commentlist[0]
			task.lastTime = comment.create_time
			task.lastId = md5(task.aid + comment.uin + comment.create_time)
			task.addCount = task.cNum - task.commentNum
			this.commentList( task, total, (err) => {
				callback()
			})
		})
	}
	commentList( task, total, callback ){
		let page  = 0,
			pos   = 0,
            option
		async.whilst(
			() => {
				return page < total
			},
			(cb) => {
				option = {
					url: this.settings.qzone + task.bid + '&tid=' + task.aid + '&pos=' + pos
				}
				request.get( logger, option, (err, result) => {
					if(err){
						logger.debug('qzone评论列表请求失败',err)
						return cb()
					}
					try{
						result = eval(result.body)
					} catch(e) {
						logger.debug('qzone评论数据解析失败')
						logger.info(result)
						return cb()
					}
					this.deal( task, result.commentlist, (err) => {
						if(task.isEnd){
							return cb()
						}
						page++
						pos += 20
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
				let  cid = md5(task.aid + comments[index].uin + comments[index].create_time)
				if(task.commentId == cid || task.commentTime >= comments[index].create_time){
					task.isEnd = true
					return callback()
				}
				comment = {
					cid: cid,
					content: Utils.stringHandling(comments[index].content),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
					ctime: comments[index].create_time,
					reply: comments[index].replyNum,
					c_user: {
						uid: comments[index].uin,
						uname: comments[index].name,
						uavatar: 'http://qlogo3.store.qq.com/qzone/'+comments[index].uin+'/'+comments[index].uin+'/100'
					}
				};
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
