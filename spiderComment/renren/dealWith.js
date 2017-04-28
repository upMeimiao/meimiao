/**
* Created by junhao on 2017/2/10.
*/
const request = require('../../lib/request');
const async = require('async');
const Utils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');
const moment = require('moment');

let logger;
class dealWith {
	constructor(spiderCore){
		this.core = spiderCore;
        this.settings = spiderCore.settings;
        logger = this.settings.logger;
        logger.trace('DealWith instantiation ...')
	}
	todo( task, callback ){
		task.cNum  = 0;      //评论的数量
		task.lastId   = 0;      //第一页评论的第一个评论Id
		task.lastTime = 0;      //第一页评论的第一个评论时间
		task.isEnd = false;  //判断当前评论跟库里返回的评论是否一致
		task.addCount   = 0;      //新增的评论数
		this.videoTotal( task, (err, result) => {
			callback(null,task.cNum,task.lastId,task.lastTime,task.addCount)
		})
	}
    videoTotal( task, callback ){
        let option = {
                url: 'http://web.rr.tv/v3plus/comment/list',
                headers:{
                    Referer: 'http://rr.tv/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
                    clientType: 'web',
                    clientVersion: '0.1.0'
                },
                data: {
                    videoId: task.aid
                }
            };
        request.post(logger, option, (err, result) => {
            if(err){
                logger.debug('人人视频评论接口请求失败',err);
                return this.getVidInfo(task, vid, callback)
            }
            try {
                result = JSON.parse(result.body);
            }catch (e){
                logger.debug('人人视频评论信息解析失败',result);
                return this.getVidInfo(task, vid, callback)
            }
            task.cNum = result.data.total;
            if((task.cNum - task.commentNum) <= 0){
                task.cNum = task.commentNum;
                task.lastId = task.commentId;
                task.lastTime = task.commentTime;
                task.addCount = 0;
                return callback()
            }
            task.lastId = result.data.results[0].id;
            task.lastTime = result.data.results[0].createTime;
            task.addCount = task.cNum - task.commentNum;
            this.commentInfo( task, () => {
                callback()
            })

        })
	}
	commentInfo( task, callback ){
    	let page = 1,
			cycle  = true,
			option = {
                url: 'http://web.rr.tv/v3plus/comment/list',
                headers:{
                    Referer: 'http://rr.tv/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
                    clientType: 'web',
                    clientVersion: '0.1.0'
                },
                data: {
                    videoId: task.aid
                }
        	};
    	async.whilst(
			() => {
				return cycle
			},
			(cb) => {
				option.data.page = page;
				request.post(logger, option, (err, result) => {
                    if(err){
                    	logger.debug(option);
                        logger.debug('人人视频评论列表接口请求失败',err);
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body);
                    }catch (e){
                        logger.debug('解析失败',result.body);
                        return cb()
                    }
                    if(result.data.results <= 0){
                    	cycle = false;
                    	return cb()
					}
                    this.deal(task, result.data.results, (err) => {
                    	if(task.isEnd){
                    		cycle = false;
						}
						page++;
                    	cb()
                    })
                });
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
            comment;
        async.whilst(
			() => {
				return index < length
			},
			(cb) => {
				cid = comments[index].id;
				if(task.commentId == cid || task.commentTime >= comments[index].createTime){
                    task.isEnd = true;
					return callback()
				}
                comment = {
					cid: cid,
					content: Utils.stringHandling(comments[index].content),
					platform: task.p,
					bid: task.bid,
					aid: task.aid,
                    ctime: comments[index].createTime,
					support: comments[index].likeCount,
					c_user: {
						uid: comments[index].author.id,
						uname: comments[index].author.nickName,
						uavatar: comments[index].author.headImgUrl
					}
				};
                Utils.commentCache(this.core.cache_db,comment);
				//Utils.saveCache(this.core.cache_db,'comment_cache',comment)
				index++;
				cb()
			},
			(err, result) => {
				callback()
			}
		)
	}
}

module.exports = dealWith;
