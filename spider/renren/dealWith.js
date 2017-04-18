/**
 * Created by penghui on 17/4/17.
 */
const moment = require('moment');
const async = require('async');
const request = require('../../lib/request');
const req = require('request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore;
        this.settings = spiderCore.settings;
        logger = this.settings.logger;
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0;
        task.page = 0;
        async.parallel(
            {
                user: (cb) => {
                    this.getUser(task, (err) => {
                        if(err){
                            return cb(err);
                        }
                        cb(null,'粉丝信息已返回');
                    })
                },
                media: (cb) => {
                    this.getTotal(task, (err) => {
                        if(err){
                            return cb(err);
                        }
                        cb(null,'视频信息已返回');
                    })
                }
            },
            (err, result) => {
                if(err){
                    return callback(err)
                }
                logger.debug('result:',result);
                callback(null,task.total)
            }
        );
    }
    getUser( task, callback ){
        let options = {
            method: 'POST',
            url: 'http://web.rr.tv/v3plus/user/userInfo',
            headers: {
                clienttype: 'web',
                clientversion: '0.1.0',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
                referer: 'http//rr.tv/'
            },
            form: {
                id: task.id
            }
        };
        req(options, (error, response, body) => {
            if(error){
                logger.debug('用户粉丝数请求失败',error.message);
                return callback(error)
            }
            if(response.statusCode != 200){
                logger.debug('用户粉丝数状态码',response.statusCode);
                return callback(response.statusCode)
            }
            try{
                body = JSON.parse(body);
            }catch (e){
                logger.debug('用户信息数据解析失败',body);
                return callback(e)
            }
            let user = {
                bid: task.id,
                platform: task.p,
                fans_num: body.data.user.fansCount
            };
            logger.debug(user);
            //this.sendUser(user);
            this.sendStagingUser(user);
            callback()
        })
    }
    sendUser (user){
        let option = {
            url: this.settings.sendFans,
            data: user
        };
        request.post( logger, option, (err,back) => {
            if(err){
                logger.error( 'occur error : ', err );
                logger.info(`返回人人视频用户 ${user.bid} 连接服务器失败`);
                return
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`人人视频用户 ${user.bid} json数据解析失败`);
                logger.info(back);
                return
            }
            if(back.errno == 0){
                logger.debug("人人视频用户:",user.bid + ' back_end');
            }else{
                logger.error("人人视频用户:",user.bid + ' back_error');
                logger.info(back);
                logger.info(`user info: `,user)
            }
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            data: user
        };
        request.post( logger, option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err );
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败');
                logger.info('send error:',result);
                return
            }
            if(result.errno == 0){
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error');
                logger.info(result)
            }
        })
    }
    getTotal( task, callback ){
        let options = {
            method: 'POST',
            url: 'http://web.rr.tv/v3plus/uper/videoList',
            headers: {
                clienttype: 'web',
                clientversion: '0.1.0',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
                referer: 'http//rr.tv/'
            },
            form: {
                sort: 'updateTime',
                userId: task.id,
                page: 1,
                row: 20
            }
        };
        req(options, (error, response, body ) => {
            if(error){
                logger.debug('视频总量请求失败',error.message);
                return callback(error)
            }
            if(response.statusCode != 200){
                logger.debug('视频总量状态码',response.statusCode);
                return callback(response.statusCode)
            }
            try{
                body = JSON.parse(body);
            }catch (e){
                logger.debug('视频总量数据解析失败',body);
                return callback(e)
            }
            task.total = body.data.total;
            this.getList(task, options, () => {
                callback()
            })
        })
    }
    getList( task, options, callback ){
        let page = 1,
            total = task.total % 20 === 0 ? task.total / 20 : Math.ceil(task.total / 20);
        async.whilst(
            () => {
                return page < Math.min(total,500)
            },
            (cb) => {
                options.form.page = page;
                req(options, (error, response, body) => {
                    if(error){
                        logger.debug('视频列表请求失败',error.message);
                        return callback(error)
                    }
                    if(response.statusCode != 200){
                        logger.debug('视频列表状态码',response.statusCode);
                        return callback(response.statusCode)
                    }
                    try{
                        body = JSON.parse(body);
                    }catch (e){
                        logger.debug('视频列表数据解析失败',body);
                        return callback(e)
                    }
                    this.deal(task, body.data.results, () => {
                        page++;
                        cb()
                    })
                })
            },
            (err, result) => {
                callback()
        }
        )
    }
    deal ( task, info, callback ) {
        let index = 0,
            length = info.length;
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getInfo( task, info[index], () => {
                    index++;
                    cb()
                })
            },
            ( err, data ) => {
                callback()
            }
        )
    }

    getInfo( task, data, callback ){
        let aid = data.id;
        async.waterfall(
            [
                (cb) => {
                    this.getVidInfo( task, aid, ( err, result ) => {
                        cb(null,result)
                    })
                }
            ],
            (err,result) => {
                if(result == '没有数据'){
                    logger.debug('没有数据')
                    return callback()
                }
                let media = {
                    bid: task.id,
                    author: task.name,
                    platform: task.p,
                    aid: aid,
                    title: spiderUtils.stringHandling(data.title,80),
                    play_num: data.viewCount,
                    comment_num: data.commentCount,
                    save_num: data.favCount,
                    v_img: data.cover,
                    class: data.category,
                    v_url: 'http://rr.tv/#/video/'+aid,
                    //a_create_time: moment(data._created_at).unix(),
                    tag: result.tagStrs,
                    desc: spiderUtils.stringHandling(data.brief,100),
                    long_t: result.rawDuration
                };
                spiderUtils.saveCache( this.core.cache_db, 'cache', media );
                callback();
            }
        )
    }
    getVidInfo( task, aid, callback ){
        let options = {
            method: 'POST',
            url: 'http://web.rr.tv/v3plus/video/detail',
            headers:
                { clienttype: 'web',
                    clientversion: '0.1.0',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
                    referer: 'http//rr.tv/'
                },
            form: {
                videoId: aid
            }
        };
        req(options, (error, response, body) => {
            if(error){
                logger.debug('视频接口请求失败',error.message);
                return callback(error, {code:102,p:41})
            }
            if(response.statusCode != 200){
                logger.debug('视频接口状态码错误',response.statusCode);
                return callback(response.statusCode, {code:102,p:41})
            }
            try{
                body = JSON.parse(body);
            }catch (e){
                logger.debug('数据解析失败：',body);
                return callback(e,{code:103,p:41})
            }
            body = body.data.videoDetailView;
            body.tagStrs = _tags(body.tagList);
            callback(null,body)
        })
    }
}
function _tags(raw){
    let str = '';
    if(!raw){
        return str;
    }
    for(let i = 0; i < raw.length; i++){
        str += ','+raw[i].name
    }
    return str.replace(',','')
}
module.exports = dealWith