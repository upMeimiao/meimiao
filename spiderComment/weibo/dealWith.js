/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request')
const async = require('async')
const Utils = require('../../lib/spiderUtils')
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
		this.total( task, (err, result) => {
			if(result == 'add_0'){
				return callback(null)
			}
			if(err){
				logger.error(err)
				return callback(err)
			}
			callback(null,task.cNum,task.lastId,task.lastTime,task.addCount)
		})
	}
	getProxy(callback){
        let proxyStatus = false,
            proxy       = '',
            times       = 0
        if(proxyStatus && proxy){
            callback(null,proxy)
        }else{
            this.core.proxy.need(times, (err, _proxy) => {
                if(err){
                    if(err == 'timeout'){
                        return callback(null,'timeout')
                    }
                    logger.error('Get proxy occur error:', err)
                    times++
                    proxyStatus = false
                    this.core.proxy.back(_proxy, false)
                    return callback(null,false)
                }
                times = 0
                callback(null,_proxy)
            })
        }
    }
	total( task, callback ){
		let option = {
			url: this.settings.weibo.comment + task.aid + '&page=1'
		},
			total = 0
		this.getProxy( (err, proxy) => {
			if(proxy == 'timeout'){
				return callback('timeout ~')
			}
			if(!proxy){
				return this.total(task,callback)
			}
			option.proxy = proxy
			request.get( logger, option, (err, result) => {
				if(err){
					logger.debug('微博的评论总数请求失败')
					this.core.proxy.back(proxy, false)
					return this.total(task,callback)
				}
				try{
					result = JSON.parse(result.body)
				}catch(e){
					logger.debug('微博数据解析失败')
					logger.info(result)
					this.core.proxy.back(proxy, false)
					return this.total(task,callback)
				}
				task.cNum = result.total_number
                if((task.cNum - task.commentNum) <= 0){
                    return callback(null,'add_0')
                }
                if(task.commentNum <= 0){
                    total = (task.cNum % 20) == 0 ? task.cNum / 20 : Math.ceil(task.cNum / 20)
                }else{
                    total = (task.cNum - task.commentNum)
                    total = (total % 20) == 0 ? total / 20 : Math.ceil(total / 20)
                }
				task.lastId = result.data[0].id
				task.lastTime = this.creatTime(result.data[0].created_at)
				logger.debug(task.lastTime)
				task.addCount = task.cNum - task.commentNum
				this.commentList( task, total, proxy, (err) => {
					if(err){
						return callback(err)
					}
					callback()
				})
			})
		})
	}
	commentList( task, total, proxy, callback ){
		let page  = 1
		async.whilst(
			() => {
				return page <= total
			},
			(cb) => {
				let option = {
					url: this.settings.weibo.comment + task.aid + '&page=' + page
				}
				option.proxy = proxy
				request.get( logger, option, (err, result) => {
					if(err){
						logger.debug('微博评论列表请求失败',err)
						this.core.proxy.back(proxy, false)
						return this.getProxy((err, _proxy) => {
							if (proxy == 'timeout') {
		                        return callback('timeout ~')
		                    }
		                    proxy = _proxy
		                    cb()
						})
					}
					try{
						result = JSON.parse(result.body)
					} catch(e) {
						logger.debug('微博评论数据解析失败')
						logger.info(result)
						this.core.proxy.back(proxy, false)
						return this.getProxy((err, _proxy) => {
							if (proxy == 'timeout') {
		                        return callback('timeout ~')
		                    }
		                    proxy = _proxy
                            cb()
						})
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
			time;
		async.whilst(
			() => {
				return index < length
			},
			(cb) => {
				//过滤评论内容中的HTML标签，暂时先不过滤掉
				//let content = Utils.clearHtml(comments[index].text)
                time = this.creatTime( comments[index].created_at )
				if(task.commentId == comments[index].id || task.commentTime >= time){
					task.isEnd = true
					return callback()
				}
				comment = {
					cid: comments[index].id,
					content: Utils.stringHandling(comments[index].text),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
                    ctime: time,
					support: comments[index].like_counts,
					c_user: {
						uid: comments[index].user.id,
						uname: comments[index].user.screen_name,
						uavatar: comments[index].user.profile_image_url
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
    creatTime( time ){
        let newTime;
        if(!time){
            return ''
        }
        if(time.includes('刚刚')){
            return moment().unix()
        }
        if(time.includes('秒')){
            time = time.replace('秒','');
            time = Number(moment().unix()) - Number(time);
            return time
        }
        if(time.includes('分钟')){
            time = time.replace('分钟前','');
            time = Number(moment().unix()) - (Number(time)*60);
            return time
        }
        if(time.includes('今天')){
            time = time.replace('今天','');
            newTime = moment.unix(moment().unix()).toDate().toJSON().toString().substr(0,10);
            time = newTime + time+':00';
            time = new Date(time);
            return moment(time).format('X')
        }
        if(time.includes('昨天')){
            time = time.replace('昨天','');
            newTime = (Number(moment().unix()) - (24*60*60));
            newTime = moment.unix(newTime).toDate().toJSON().toString().substr(0,10);
            time = newTime + time+':00';
            time = new Date(time);
            return moment(time).format('X')
        }
        let timeArr = time.split(' ')[0];
        timeArr = timeArr.split('-');
        if(timeArr.length == 2){
        	time = new Date().getFullYear() + '-' + time + ':00';
            time = new Date(time);
			return moment(time).format('X')
		}
    }
}

module.exports = dealWith
