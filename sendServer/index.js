const async = require('async')
const request = require('request')
const util = require('util')
const events = require('events')
const Redis = require('ioredis')

let logger
class sendServer {
    constructor(settings) {
        events.EventEmitter.call(this)
        this.settings = settings
        logger = settings.logger
        this.onlineOption = {
            url: "http://100.98.39.12/index.php/Spider/video/postVideosMore/",//settings.sendUrl,
            headers: {
                'Content-Type':'application/x-www-form-urlencoded'
            }
        }
        this.stagingOption = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/video/postVideosMore/',
            headers: {
                'Content-Type':'application/x-www-form-urlencoded'
            }
        }
        this.redis = new Redis(`redis://:${settings.redis.auth}@${settings.redis.host}:${settings.redis.port}/${settings.redis.cache_db}`,{
            reconnectOnError: function (err) {
                if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
                    return true
                }
            }
        })
        logger.trace('sendServer instantiation ...')
    }
    assembly () {
        this.emit('get_lists')
        setInterval(() => {
            this.emit('get_lists')
        }, 1000)
    }
    start () {
        logger.trace('启动函数')
        this.on('get_lists', () => {
            this.getData()
        })
        this.on('get_lists_staging', () => {
            this.deal_staging()
        })
        this.on('send_data', (raw, time) => {
            //this.deal(raw)
            this.sendOnline(raw, time)
        })
        this.on('send_data_staging', (raw, time) => {
            this.send_staging(raw, time)
        })
        this.assembly()
    }
    getData() {
        const key = [],list = []
        for( let i = 0; i < 300; i++){
            key[i] = ['lpop', 'cache']
        }
        this.redis.pipeline(
            key
        ).exec((err, result) => {
            if(err){
                return
            }
            for (let [index, elem] of result.entries()) {
               if(elem[1]){
                   list.push(JSON.parse(elem[1]))
               }
            }
            this.emit('send_data', list, 0)
            this.emit('send_data_staging', list, 0)
        })
    }
    deal(list){
        let i = 0, length = list.length
        async.whilst(
            () => {
                return i < length
            },
            (cb) => {
                // this.send(list[i], 0)
                // i++
                // cb()
                setTimeout(() => {
                    this.send(list[i], 0)
                    i++
                    cb()
                }, 5)
            }
        )
    }
    sendOnline(list, time){
        if(list.length ==0){
            list = null
            return
        }
        let newList = []
        for (let [index, elem] of list.entries()) {
            if((elem.platform < 27 && elem.platform != 21) || elem.platform == 29){
                newList.push(elem)
            }
        }
        if(newList.length ==0){
            list = null
            newList = null
            return
        }
        this.onlineOption.form = {data: newList}
        request.post(this.onlineOption, (err, res, result) => {
            if(err){
                logger.error('online occur error : ', err.message)
                time++
                if(time > 3){
                    list = null
                    time = null
                    newList = null
                }else{
                    setTimeout(() => {
                        this.emit('send_data', list, time)
                    }, 300)
                }
                return
            }
            if(res.statusCode != 200){
                logger.error(`online errorCode: ${res.statusCode}`)
                logger.error(result)
                time++
                if(time > 3){
                    list = null
                    time = null
                    newList = null
                }else{
                    setTimeout(() => {
                        this.emit('send_data', list, time)
                    }, 1500)
                }
                return
            }
            try{
                result = JSON.parse(result)
            }catch (e){
                logger.error(`online 返回数据 json数据解析失败`)
                logger.error(result)
                //logger.error(JSON.stringify(newList))
                list = null
                time = null
                newList = null
                return
            }
            if(result.errno == 0){
                //logger.debug('online back end')
                //logger.debug(result.data)
            }else{
                //logger.error('staging back error')
                logger.error(result)
                //logger.error('media info: ',list)
            }
            //logger.debug(`${newList.length}个视频 online back end`)
            list = null
            newList = null
            time = null
        })
    }
    send(media, time){
        //logger.debug(media)
        if(media.platform > 26 || media.platform == 21 || media.platform == 23){
            media = null
            return
        }
        this.onlineOption.form = media
        request.post(this.onlineOption, (err, res, result) => {
            if(err){
                logger.error('master occur error : ', err.message)
                logger.error(media)
                logger.info(`返回平台${media.platform}视频 ${media.aid} 连接服务器失败`)
                time++
                if(time > 3){
                    media = null
                    time = null
                }else{
                    this.send(media, time)
                }
                return
            }
            if(res.statusCode != 200){
                logger.error(`master errorCode: ${res.statusCode}`)
                time++
                if(time > 3){
                    media = null
                    time = null
                }else{
                    setTimeout(() => {
                        this.send(media, time)
                    }, 1500)
                }
                return
            }
            try{
                result = JSON.parse(result)
            }catch (e){
                logger.error(`平台${media.platform}视频 ${media.aid} json数据解析失败`)
                logger.error(result)
                media = null
                time = null
                return
            }
            if(result.errno == 0){
                //logger.debug(`平台${media.platform}:`,media.aid + ' back end')
                //logger.info(result)
            }else{
                logger.error(`平台${media.platform}:`,media.aid + ' back error')
                logger.error(result)
                logger.error('media info: ',media)
            }
            media = null
            time = null
        })
    }
    send_staging(list, time) {
        if(list.length ==0){
            list = null
            return
        }
        // let newList = [],length = Math.min(list.length,150)
        // for(let i = 0; i < length; i++){
        //     newList.push(list[i])
        // }
        this.stagingOption.form = {data: list}
        request.post(this.stagingOption, (err, res, result) => {
            if(err){
                logger.error('staging occur error : ', err.message)
                time++
                if(time > 3){
                    list = null
                    time = null
                    // newList = null
                }else{
                    setTimeout(() => {
                        this.emit('send_data_staging', list, time)
                    }, 300)
                }
                return
            }
            if(res.statusCode != 200){
                logger.error(`staging errorCode: ${res.statusCode}`)
                logger.error(result)
                time++
                if(time > 3){
                    list = null
                    time = null
                    // newList = null
                }else{
                    setTimeout(() => {
                        this.emit('send_data_staging', list, time)
                    }, 1500)
                }
                return
            }
            try{
                result = JSON.parse(result)
            }catch (e){
                logger.error(`staging 返回数据 json数据解析失败`)
                logger.error(result)
                logger.error(JSON.stringify(list))
                list = null
                time = null
                return
            }
            if(result.errno == 0){
                logger.debug('staging back end')
                logger.debug(result.data)
            }else{
                //logger.error('staging back error')
                logger.error(result)
                //logger.error('media info: ',list)
            }
            //logger.debug(`${list.length}个视频 staging back end`)
            list = null
            // newList = null
            time = null
        })
    }
}
util.inherits( sendServer, events.EventEmitter )
module.exports = sendServer