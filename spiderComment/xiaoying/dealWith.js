/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request')
const async = require('async')
const Utils = require('../../lib/spiderUtils')
const cheerio = require('cheerio')
const req = require('request')
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
	getH(callback ){
		const options = { method: 'POST',
            url: 'http://viva.api.xiaoying.co/api/rest/d/dg',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'User-Agent':'XiaoYing/5.3.5 (iPhone; iOS 10.1.1; Scale/3.00)'
            },
            form: {
                a: 'dg',
                b: '1.0',
                c: '20007700',
                e: 'DIqmr4fb',
                i: '{"a":"[I]a8675492c8816a22c28a1b97f890ae144a8a4fa3","b":"zh_CN"}',
                j: '6a0ea6a13e76e627121ee75c2b371ef2',
                k: 'xysdkios20130711'
            }
        }
        req( options, (error, response, body) => {
			if (error) {
                return callback(error)
            }
            try {
                body = JSON.parse(body)
            } catch (e){
                return callback(e)
            }
            let h = body.a
            //logger.debug(h.a)
            callback(null,h.a)
        })
	}
	totalPage( task, callback ){
		//logger.debug(this.core.h)
		let option   = {
			method: 'POST',
			url: this.settings.xiaoying,
			headers:{
                'content-type': 'application/x-www-form-urlencoded',
                'user-agent': 'XiaoYing/5.5.6 (iPhone; iOS 10.2.1; Scale/3.00)'
            },
			form:{ 
				a: 'pa',
				b: '1.0',
				c: '20008400',
				e: 'DIqmr4fb',
				h: this.core.h,
				i: '{"d":20,"b":"1","c":1,"a":"'+ task.aid +'"}',
				j: 'ae788dbe17e25d0cff743af7c3225567',
				k: 'xysdkios20130711' 
			} 
		},
			total = 0
		req(option, (error, response, body) => {
			if(error){
				logger.debug('小影评论总量请求失败',error)
				return this.totalPage(task,callback)
			}
            try{
				body = JSON.parse(body)
			} catch(e) {
				logger.debug('小影评论数据解析失败')
				logger.info(body)
				return this.totalPage(task,callback)
			}
            task.cNum = body.total;
            if((task.cNum - task.commentNum) <= 0){
                return callback(null,'add_0')
            }
			if(task.commentNum <= 0){
				total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20)
			}else{
				total = (task.cNum - task.commentNum)
				total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20)
			}
			task.lastTime = this.time( body.comments[0].publishTime );
			task.lastId = body.comments[0].id;
			task.addCount = task.cNum - task.commentNum;
            this.commentList( task, total, (err) => {
				callback()
			})
		})
	}
	commentList( task, total, callback ){
		let page  = 1,
            option;
		logger.debug('+++')
		async.whilst(
			() => {
				return page <= total
			},
			(cb) => {
				option   = {
						method: 'POST',
						url: this.settings.xiaoying,
						headers:{
			                'content-type': 'application/x-www-form-urlencoded',
			                'user-agent': 'XiaoYing/5.5.6 (iPhone; iOS 10.2.1; Scale/3.00)'
			            },
						form:{ 
							a: 'pa',
							b: '1.0',
							c: '20008400',
							e: 'DIqmr4fb',
							h: this.core.h,
							i: '{"d":20,"b":"1","c":'+ page +',"a":"'+ task.aid +'"}',
							j: 'ae788dbe17e25d0cff743af7c3225567',
							k: 'xysdkios20130711' 
						} 
					}
				req( option, (error, response, body) => {
					if(error){
						logger.debug('小影评论列表请求失败',err)
						return cb()
					}
					try{
						body = JSON.parse(body)
					} catch(e) {
						logger.debug('小影评论数据解析失败')
						logger.info(body)
						return cb()
					}
					this.deal( task, body.comments, (err) => {
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
            time;
		async.whilst(
			() => {
				return index < length
			},
			(cb) => {
				time = this.time( comments[index].publishTime )
				if(task.commentId == comments[index].id || task.commentTime >= time){
					task.isEnd = true
					return callback()
				}
				comment = {
					cid: comments[index].id,
					content: Utils.stringHandling(comments[index].content),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
					ctime: time,
					support: comments[index].liked,
					step: comments[index].isLiked,
					c_user: {
						uid: comments[index].user.auid,
						uname: comments[index].user.nickName,
						uavatar: comments[index].user.profileImageUrl
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
	time( time ){
		time = time.split('')
		time[3] = time[3] + '-'
		time[5] = time[5] + '-'
		time[7] = time[7] + ' '
		time[9] = time[9] + ':'
		time[11] = time[11] + ':'
		time = new Date(time.join(''))
		time = moment(time).format('X')
		return time
	}
}

module.exports = dealWith
