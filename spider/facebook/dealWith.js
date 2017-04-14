/**
 * Created by zhupenghui on 17/4/12.
 */
const moment = require('moment');
const async = require( 'async' );
const request = require( '../../lib/request' );
const spiderUtils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');
const req = require('request');

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
        async.series(
            {
                user: (cb) => {
                    this.getUser(task, (err) => {
                        if(err){
                            return cb(err)
                        }
                        cb(null,'用户信息已返回')
                    })
                },
                media: (cb) => {
                    this.getListInfo(task,(err) => {
                        cb(null,'视频信息已返回')
                    })
                }
            },
            (err, result) => {
                logger.debug('result', result);
                if(err){
                    return callback(err);
                }
                callback(null,task.total)
            }
        );
    }
    getUser( task, callback ){
        let option = {
            method: 'POST',
            url: `https://www.facebook.com/pages/call_to_action/fetch_dialog_data/?id=${task.id}&surface=pages_actions_unit&unit_type=VIEWER&dpr=1`,
            proxy: 'http://127.0.0.1:56777',
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36 }'
            },
            formData: {
                __user: '0',
                __a: '1'
            }
        };
        req(option, (error, response, body) => {
            if(error){
                logger.debug('用户信息请求失败',error);
                return callback(error)
            }
            if(response.statusCode != 200){
                logger.debug('状态码错误',response.statusCode);
                return callback(`用户信息状态码错误${response.statusCode}`);
            }
            try {
                body = body.replace('for (;;);','');
                body = JSON.parse(body);
            } catch (e){
                logger.debug('用户信息解析失败');
                logger.info(body);
                return callback(e)
            }
            let url = body.payload.pageUrl + 'likes/?ref=page_internal'
            this.getUserInfo(task, url, (err) => {
                callback()
            })
        })
    }
    getUserInfo( task, url, callback ){
        let option = {
            url: url,
            proxy: 'http://127.0.0.1:56777',
            referer: url,
            ua: 2
        };
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('错误信息：',err);
                return this.getUserInfo(task,url,callback)
            }
            result = result.body.replace(/[\n\r]/g,'');
            let $ = cheerio.load(result),
                script = $('script')[5].children[0].data,
                fans;
                script = script.replace('new (require("ServerJS"))().setServerFeatures("iw").handle(','').replace(');','');
            try{
                script = JSON.parse(script);
            }catch (e) {
                logger.debug('粉丝数据解析失败',script);
                return this.getUserInfo(task,url,callback)
            }
            for (let i = 0; i < script.require.length; i++){
                if(script.require[i][1] == 'renderFollowsData'){
                    fans = script.require[i][3][3]
                    break;
                }
            }
            let res = {
                bid: task.id,
                platform: task.p,
                fans_num: fans
            };
            //this.sendUser(res);
            this.sendStagingUser(res);
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
                logger.info(`返回facebook视频用户 ${user.bid} 连接服务器失败`);
                return
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`facebook视频用户 ${user.bid} json数据解析失败`);
                logger.info(back);
                return;
            }
            if(back.errno == 0){
                logger.debug("facebook视频用户:",user.bid + ' back_end');
            }else{
                logger.error("facebook视频用户:",user.bid + ' back_error');
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
                return;
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败');
                logger.info('send error:',result);
                return
            }
            if(result.errno == 0){
                logger.debug("用户:",user.bid + ' back_end');
            }else{
                logger.error("用户:",user.bid + ' back_error');
                logger.info(result);
            }
        })
    }
    getListInfo( task, callback ){
        let option = {
                ua: 2,
                proxy: 'http://127.0.0.1:56777',
                referer: 'https://www.facebook.com'
            },
            cursor = null,
            lastVid = null,
            cycle = true,
            $;
        async.whilst(
            () => {
                return cycle
            },
            (cb) => {
                option.url = `${this.settings.spiderAPI.facebook.list}{"last_fbid":${lastVid},"page":${task.id},"playlist":null,"cursor":"${cursor}"}&__user=0&__a=1`;
                request.get(logger, option, (err, result) => {
                    if(err){
                        logger.debug('facebook视频列表请求失败',err);
                        return this.getListInfo(task,callback)
                    }
                    try{
                        result = result.body.replace(/for \(;;\);/,'').replace(/[\n\r]/g,'');
                        result = JSON.parse(result)
                    }catch (e){
                        logger.debug('facebook视频数据解析失败');
                        logger.debug(result);
                        return this.getListInfo(task,callback)
                    }
                    $ = cheerio.load(result.payload);
                    task.total += $('td').length;
                    if(!result.jscc_map){
                        cycle = false;
                    }else {
                        result = result.jscc_map.substring(result.jscc_map.indexOf('", {')+2,result.jscc_map.indexOf(', null)'));
                        result = JSON.parse(result);
                        cursor = result.cursor;
                        lastVid = result.last_fbid;
                    }
                    this.deal(task, $('td'), () => {
                        cb()
                    })
                })
            },
            (err, result) => {
                callback()
            }
        )
    }
    deal( task, list, callback ){
        let index = 0;
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.getMedia( task, list.eq(index), (err) => {
                    index++;
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getMedia( task, video, callback ){
        let aid = video.find('div._3v4h>a').attr('href').split('/')[3];
        async.series(
            [
                (cb) => {
                    this.getVidInfo(task, aid, (err,result) => {
                        cb(null,result)
                    })
                }
            ],
            (err, result) => {
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: aid,
                    title: result[0].title,
                    a_create_time: result[0].time,
                    v_img: result[0].v_img,
                    support: result[0].ding,
                    desc: result[0].desc,
                    v_url: result[0].playUrl,
                    comment_num: result[0].commentNum,
                    play_num: result[0].playNum,
                    forward_num: result[0].sharecount
                };
                spiderUtils.saveCache( this.core.cache_db, 'cache', media );
                callback()
            }
        )
    }
    getVidInfo(task, vid, callback ){
        let option = {
                url: `${this.settings.spiderAPI.facebook.vidInfo}"v":"${vid}","firstLoad":true,"ssid":${new Date().getTime()}}&__user=0&__a=1`,
                ua: 2,
                proxy: 'http://127.0.0.1:56777',
                referer: `https://www.facebook.com/pg/${task.id}/videos/?ref=page_internal`
            },
            dataJson = null,
            time, title, desc, playNum, playUrl, commentNum, ding, sharecount, $, _$, v_img;
        request.get(logger, option, (err, result) => {
            if(err){
                logger.debug('facebook单个视频信息接口请求失败',err);
                return this.getVidInfo(task, vid, callback)
            }
            try {
                result = result.body.replace(/for \(;;\);/,'').replace(/[\n\r]/g,'');
                result = JSON.parse(result)
            }catch (e){
                logger.debug('facebook单个视频信息解析失败',result);
                return this.getVidInfo(task, vid, callback)
            }
            for(let i = 0; i < result.jsmods.markup.length; i++){
                if(result.jsmods.markup[i][2] == 42){
                    $ = cheerio.load(result.jsmods.markup[i][1].__html);
                }else {
                    if(result.jsmods.markup[i][2] == 41 && result.jsmods.markup[i][1].__html){
                        $ = cheerio.load(result.jsmods.markup[i][1].__html);
                    }
                }
                if(result.jsmods.markup[i][2] == 16){
                    _$ = cheerio.load(result.jsmods.markup[1][1].__html);
                }
            }
            time = $('a._39g5>abbr').attr('data-utime');
            title = spiderUtils.stringHandling($('span.hasCaption').text(),50);
            desc = spiderUtils.stringHandling($('span.hasCaption').text(),100);
            playNum = $('div._4p3v>span.fcg').text().replace('次播放','').replace(/[\s,]/g,'');
            v_img = _$('img._1445').attr('style').replace('background-image: url(','').replace(');','');
            v_img = decodeURIComponent(v_img);
            dataJson = result.jsmods.require;
            for (let i = 0; i < dataJson.length; i++){
                if(dataJson[i][0] == 'UFIController' && dataJson[i][3][1].ftentidentifier == vid){
                    commentNum = dataJson[i][3][2].feedbacktarget.commentcount;
                    ding = dataJson[i][3][2].feedbacktarget.likecount;
                    sharecount = dataJson[i][3][2].feedbacktarget.sharecount;
                    playUrl = 'https://www.facebook.com' + dataJson[i][3][2].feedbacktarget.permalink;
                    break;
                }
            }
            dataJson = {
                time: time || '',
                title: title || '',
                desc: desc || '',
                playNum: playNum,
                v_img: v_img || '',
                commentNum: commentNum,
                ding: ding,
                sharecount: sharecount,
                playUrl: playUrl || ''
            };
            return callback(null,dataJson)
        })
    }
}
module.exports = dealWith