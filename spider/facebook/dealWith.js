/**
 * Created by zhupenghui on 17/4/12.
 */
const moment = require('moment');
const async = require('neo-async');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');

let logger;
class dealWith {
    constructor(spiderCore){
        this.core = spiderCore;
        this.settings = spiderCore.settings;
        logger = this.settings.logger;
        logger.trace('DealWith instantiation ...')
    }
    todo(task, callback) {
        task.total = 0;
        async.series(
            {
                user: (cb) => {
                    this.getUserInfo(task, (err) => {
                        if(err){
                            return cb(err)
                        }
                        cb(null,'用户信息已返回')
                    })
                },
                media: (cb) => {
                    this.getListInfo(task,(err) => {
                        if(err){
                            return cb(err)
                        }
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
    getUserInfo(task, callback){
        let option = {
            url: `https://www.facebook.com/pg/${task.id}/likes/?ref=page_internal`,
            // proxy: 'http://127.0.0.1:56777',
            referer: `https://www.facebook.com/pg/${task.id}/likes/?ref=page_internal`,
            ua: 1
        };
        request.get(logger, option, (err, result) => {
            if(err){
                return callback(err)
            }
            result = result.body.replace(/[\n\r]/g,'');
            let $ = cheerio.load(result),
                script = $('script')[5].children[0].data,
                fans;
                script = script.replace('new (require("ServerJS"))().setServerFeatures("iw").handle(','').replace(');','');
            try{
                script = JSON.parse(script);
            }catch (e) {
                logger.error('粉丝数据解析失败',script);
                return callback(e)
            }
            for (let i = 0; i < script.require.length; i++){
                if(script.require[i][1] === 'renderFollowsData'){
                    fans = script.require[i][3][3]
                    break;
                }
            }
            let res = {
                bid: task.id,
                platform: task.p,
                fans_num: fans
            };
            logger.debug(res)
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
                return
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`facebook视频用户 ${user.bid} json数据解析失败`);
                logger.error(back);
                return;
            }
            if(back.errno == 0){
                logger.debug("facebook视频用户:",user.bid + ' back_end');
            }else{
                logger.error("facebook视频用户:",user.bid + ' back_error');
                logger.error(back);
                logger.error(`user info: `,user)
            }
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            data: user
        };
        request.post(logger, option, (err, result) => {
            if(err){
                return;
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败');
                logger.error('send error:',result);
                return
            }
            if(result.errno == 0){
                logger.debug("用户:",user.bid + ' back_end');
            }else{
                logger.error("用户:",user.bid + ' back_error');
                logger.error(result);
            }
        })
    }
    getListInfo( task, callback ){
        let option = {
                ua: 2,
                // proxy: 'http://127.0.0.1:56777',
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
                        return this.getListInfo(task,callback)
                    }
                    try{
                        result = result.body.replace(/for \(;;\);/,'').replace(/[\n\r]/g,'');
                        result = JSON.parse(result)
                    }catch (e){
                        logger.error('facebook视频数据解析失败');
                        logger.error(result);
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
        let aid = video.find('div._3v4h>a').attr('href');
        aid = aid ? aid.split('/')[3] : video.find('div._5asl>a.__-q').attr('href').split('/')[3];
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
                    desc: result[0].desc,
                    v_img: result[0].v_img,
                    support: result[0].ding,
                    v_url: result[0].playUrl,
                    comment_num: result[0].commentNum,
                    play_num: result[0].playNum,
                    forward_num: result[0].sharecount,
                    a_create_time: result[0].time
                };
                media = spiderUtils.deleteProperty(media)
                logger.debug(media)
                spiderUtils.saveCache(this.core.cache_db, 'cache', media);
                callback()
            }
        )
    }
    getVidInfo(task, vid, callback ){
        let option = {
                url: `${this.settings.spiderAPI.facebook.vidInfo}"v":"${vid}","firstLoad":true,"ssid":${new Date().getTime()}}&__user=0&__a=1`,
                ua: 2,
                // proxy: 'http://127.0.0.1:56777',
                referer: `https://www.facebook.com/pg/${task.id}/videos/?ref=page_internal`
            },
            dataJson = null,
            time, title, desc, playNum, commentNum, ding, sharecount, $, _$, v_img;
        request.get(logger, option, (err, result) => {
            if(err){
                logger.error('facebook单个视频信息接口请求失败',err);
                return this.getVidInfo(task, vid, callback)
            }
            try {
                result = result.body.replace(/for \(;;\);/,'').replace(/[\n\r]/g,'');
                result = JSON.parse(result)
            }catch (e){
                logger.error('facebook单个视频信息解析失败',result);
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
            title = spiderUtils.stringHandling($('span.hasCaption').text(),80);
            desc = spiderUtils.stringHandling($('span.hasCaption').text(),100);
            playNum = $('div._4p3v>span.fcg').text().replace('次播放','').replace(/[\s,]/g,'');
            v_img = _$('img._1445').attr('style').replace('background-image: url(','').replace(');','');
            v_img = decodeURIComponent(v_img);
            dataJson = result.jsmods.require;
            for (let i = 0; i < dataJson.length; i++){
                if(dataJson[i][0] === 'UFIController' && dataJson[i][3][1].ftentidentifier == vid){
                    commentNum = dataJson[i][3][2].feedbacktarget.commentcount;
                    ding = dataJson[i][3][2].feedbacktarget.likecount;
                    sharecount = dataJson[i][3][2].feedbacktarget.sharecount;
                    break;
                }
            }
            dataJson = {
                time: time || null,
                title: title || 'btwk_caihongip',
                desc: desc || '',
                playNum: playNum || null,
                v_img: v_img || '',
                commentNum: commentNum || null,
                ding: ding || null,
                sharecount: sharecount || null
            };
            return callback(null,dataJson)
        })
    }
}
module.exports = dealWith