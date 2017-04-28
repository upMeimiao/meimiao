/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request')
const async = require('async')
const Utils = require('../../lib/spiderUtils')
const moment = require('moment')
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
			url: this.settings.cctv + task.aid + '&page=1&_' + new Date().getTime()
		},
			total
		request.get( logger, option, (err, result) => {
			if(err){
				logger.debug('cctv的评论总数请求失败')
				return this.total(task,callback)
			}
			try{
				result = JSON.parse(result.body)
			}catch(e){
				logger.debug('cctv数据解析失败')
				logger.info(result)
				return this.total(task,callback)
			}
			task.cNum = result.total
            if((task.cNum - task.commentNum) <= 0){
                return callback(null,'add_0')
            }
            if(task.commentNum <= 0){
                total = (task.cNum % 10) == 0 ? task.cNum / 10 : Math.ceil(task.cNum / 10)
            }else{
                total = (task.cNum - task.commentNum)
                total = (total % 10) == 0 ? total / 10 : Math.ceil(total / 10)
            }
			let comment = result.content[0],
				time = new Date(comment.pubdate)
				time = moment(time).format('X')
			task.lastTime = time
			task.lastId = md5(task.aid + comment.pid + time)
			task.addCount = task.cNum - task.commentNum
			this.commentList( task, total, (err) => {
				callback()
			})
		})
	}
	commentList( task, total, callback ){
		let page  = 1
		async.whilst(
			() => {
				return page <= total
			},
			(cb) => {
				let option = {
					url: this.settings.cctv + task.aid + '&page=' + page + '&_' +new Date().getTime()
				}
				request.get( logger, option, (err, result) => {
					if(err){
						logger.debug('cctv评论列表请求失败',err)
						return cb()
					}
					try{
						result = JSON.parse(result.body)
					} catch(e) {
						logger.debug('cctv评论数据解析失败')
						logger.info(result)
						return cb()
					}
					this.deal( task, result.content, (err) => {
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
			time,
			comment,
			cid
		async.whilst(
			() => {
				return index < length
			},
			(cb) => {
				time = new Date(comments[index].pubdate)
				time = moment(time).format('X')
				cid = md5(task.aid + comments[index].pid + time)
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
					ctime: time,
					c_user: {
						uid: comments[index].pid,
						uname: comments[index].uname
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
