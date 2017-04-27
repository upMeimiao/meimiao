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
		this.totalPage( task, (err, result) => {
			if(result == 'add_0'){
				return callback(null)
			}
			callback(null,task.cNum,task.lastId,task.lastTime,task.addCount)
		})
	}
	totalPage( task, callback ){
		let option   = {
			url: `http://m.uczzd.cn/iflow/api/v2/cmt/article/${task.aid}/comments/byhot?count=10&fr=iphone&dn=11341561814-acaf3ab1&hotValue=-1`
		},
			total = 0
		request.get( logger, option, (err, result) => {
			if(err){
				logger.debug('uc评论总量请求失败',err)
				return this.totalPage(task,callback)
			}
			try{
				result = JSON.parse(result.body)
			} catch(e) {
				logger.debug('uc评论数据解析失败')
				logger.info(result.body)
				return this.totalPage(task,callback)
			}
			task.cNum = result.data.comment_cnt
            if((task.cNum - task.commentNum) <= 0){
                return callback(null,'add_0')
            }
            if(task.commentNum <= 0){
                total = (task.cNum % 10) == 0 ? task.cNum / 10 : Math.ceil(task.cNum / 10)
            }else{
                total = (task.cNum - task.commentNum)
                total = (total % 10) == 0 ? total / 10 : Math.ceil(total / 10)
            }
			let comment = result.data.comments_map[result.data.comments[0]]
			task.lastTime = comment.time.toString().substring(0,10)
			task.lastId = comment.id
			task.addCount = task.cNum - task.commentNum
			this.commentList( task, total, (err) => {
				callback()
			})
		})
	}
	commentList( task, total, callback ){
		let page  = 1,
			hotScore = -1,
            option
		async.whilst(
			() => {
				return page <= total
			},
			(cb) => {
				option = {
					url: `http://m.uczzd.cn/iflow/api/v2/cmt/article/${task.aid}/comments/byhot?count=10&fr=iphone&dn=11341561814-acaf3ab1&hotValue=${hotScore}`
				}
				request.get( logger, option, (err, result) => {
					if(err){
						logger.debug('uc评论列表请求失败',err)
						return cb()
					}
					try{
						result = JSON.parse(result.body)
					} catch(e) {
						logger.debug('uc评论数据解析失败')
						logger.info(result)
						return cb()
					}
					this.deal( task, result.data, (err) => {
						if(task.isEnd){
							return callback()
						}
						let comments = result.data.comments,
							length = comments.length
						page++
						hotScore = result.data.comments_map[comments[length-1]].hotScore
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
		let length   = comments.comments.length,
			index    = 0,
            commentData,
            time,
            comment;
		async.whilst(
			() => {
				return index < length
			},
			(cb) => {
				commentData = comments.comments_map[comments.comments[index]]
				time = commentData.time.toString().substring(0,10)
				if(task.commentId == commentData.commentId || task.commentTime >= time){
					task.isEnd = true
					return callback()
				}
				comment = {
					cid: commentData.id,
					content: Utils.stringHandling(commentData.content),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
					ctime: time,
					support: commentData.up_cnt,
					reply: commentData.reply_cnt,
					c_user: {
						uid: commentData.ucid_sign,
						uname: commentData.user.nickname,
						uavatar: commentData.user.faceimg
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
