/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request')
const async = require('async')
const Utils = require('../../lib/spiderUtils')
const cheerio = require('cheerio')
const moment = require('moment')

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
			url: this.settings.budejie + `${task.aid}&page=1`
		},
			total = 0
		request.get( logger, option, (err, result) => {
			if(err){
				logger.debug('不得姐评论总量请求失败',err)
				return this.totalPage(task,callback)
			}
			try{
				result = JSON.parse(result.body)
			} catch(e) {
				logger.debug('不得姐评论数据解析失败')
				logger.info(result.body)
				return this.totalPage(task,callback)
			}
			task.cNum = result.total
            if((task.cNum - task.commentNum) <= 0){
                return callback(null,'add_0')
            }
            if(task.commentNum <= 0){
                total = (task.cNum % 5) == 0 ? task.cNum / 5 : Math.ceil(task.cNum / 5)
            }else{
                total = (task.cNum - task.commentNum)
                total = (total % 5) == 0 ? total / 5 : Math.ceil(total / 5)
            }
			let time = new Date(result.data[0].ctime)
			task.lastTime = moment(time).format('X')
			task.lastId = result.data[0].id
			task.addCount = task.cNum - task.commentNum
			this.commentList( task, total, (err) => {
				callback()
			})
		})
	}
	commentList( task, total, callback ){
		let page  = 1,
			cycle = true,
            option
		async.whilst(
			() => {
				return cycle
			},
			(cb) => {
				option = {
					url: this.settings.budejie + `${task.aid}&page=${page}`
				}
				request.get( logger, option, (err, result) => {
					if(err){
						logger.debug('不得姐评论列表请求失败',err)
						return cb()
					}
					try{
						result = JSON.parse(result.body)
					} catch(e) {
						logger.debug('不得姐评论数据解析失败')
						logger.info(result)
						return cb()
					}
					if(!result || !result.data){
						cycle = false
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
		let length   = comments.length,
			index    = 0,
            comment,
            time
		async.whilst(
			() => {
				return index < length
			},
			(cb) => {
				time = new Date(comments[index].ctime);
				time = moment(time).format('X');
				if(task.commentId == comments[index].id || task.commentTime >= time){
					task.isEnd = true
					return callback()
				}
				if(!comments[index].content){
					index++
                    return cb()
				}
				comment = {
					cid: comments[index].id,
					content: Utils.stringHandling(comments[index].content),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
					ctime: time,
					support: comments[index].like_count,
					c_user: {
						uid: comments[index].user.id,
						uname: comments[index].user.username,
						uavatar: comments[index].user.profile_image
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
