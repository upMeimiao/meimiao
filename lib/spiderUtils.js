const moment = require('moment')
const request = require('request')
const taskArray = require('../taskArray')

/**
 * 删除对象中值为null的属性
 * @param obj
 * @returns {*} 该对象被锁定，无法进行任何修改
 */
exports.deleteProperty = (obj) => {
    if(typeof obj !== 'object' || Object.prototype.toString.call(obj) === '[object Array]'){
        //参数非对象（数组也不可以），直接返回该数据  PS：把调用者拖出去吧
        return obj
    }
    let {keys, values, entries} = Object
    for (let [key, value] of entries(obj)) {
        if(value === null || value === undefined){
            delete obj[key]
        }
    }
    return Object.freeze(obj)
}

/**
 * 对抓取到的字符串（视频标题、视频详情、评论内容等）进行截取与特定字符的删除
 * @param str
 * @param length
 * @returns {*|{dist}|string|void|XML}
 */
exports.stringHandling = (str, length) => {
    if(typeof str !== 'string'){
        //参数非字符串，直接返回该数据
        return str
    }
    str = str.replace(/"/g,'')
    if(length && length > 0){
        str = str.substr(0,Number(length))
    }
    str = str.replace(/[\s\r\n]/g,'')
    return str
}

/**
 * 对抓取到的数字(应该是数字的字符串/字段)进行判断与容错处理
 * @param num
 * @returns {*}
 */
exports.numberHandling = (num) => {
    if(typeof num !== 'string' && typeof num !== 'number'){
        //参数非字符串或数字，直接返回该数据  PS：调用者需要做检讨
        return num
    }
    if(isNaN(num) && num.includes('万')){
        return Number(num.replace('万','') * 10000)
    }
    if(isNaN(num) && num.includes('亿')){
        return Number(num.replace('亿','') * 100000000)
    }
    if(isNaN(num) && num.includes(',')){
        return Number(num.replace(/,/g,''))
    }
    if(Number(num) < 0){
        /**
         * 如果该值为负数返回null，通过deleteProperty方法去掉
         * 一般情况不应该有负值，如果有特殊情况，请修改该方法
         */
        return null
    }
    return Number(num)
}

/**
 * 发送视频数据时对同一批的数据进行去重（只要是同一个视频就去掉）
 * @param mediaArr
 * @returns {Array|[*]}
 */
exports.mediaUnique = (mediaArr) => {
    if(typeof mediaArr !== 'object' && Object.prototype.toString.call(mediaArr) !== '[object Array]'){
        //参数非数组，直接返回该数据  PS：把调用者拖出去吧
        return mediaArr
    }
    let map = new Map()
    for (let [index, elem] of mediaArr.entries()) {
        map.set(elem.bid.toString() + elem.id.toString(), elem)
    }
    mediaArr = [...map.values()]
    map.clear()
    return mediaArr
}

/**
 * 将 00:00:00 与 00:00 形式的视频时长转换为秒数
 * @param time String
 * @returns {*}
 */
exports.longTime = (time) => {
    if(typeof time !== 'string'){
        //参数非字符串或数字，直接返回该数据  PS：调用者需要做检讨
        return time
    }
    let timeArr = time.split(':'),
        long_t = ''
    if(timeArr.length === 2){
        long_t = moment.duration( `00:${time}`).asSeconds()
    }else if(timeArr.length === 3){
        long_t = moment.duration(time).asSeconds()
    }
    return long_t
}

/**
 * 视频任务、评论任务发送更新状态方法
 * @param url String
 * @param data Object
 */
exports.sendUpdate = (url, data) => {
    let options = {
        method : 'POST',
        url: url,
        form : data
    }
    request(options, (err, res, body) => {
        if(err){
            return console.error(err.message)
        }
        if(res.statusCode != 200){
            return console.error(res.statusCode)
        }
        try {
            body = JSON.parse(body)
        } catch (e) {
            return console.error(e.message)
        }
        if(body.errno == 0){
            console.log(body.errmsg)
        }else{
            console.error(body)
        }
    })
}

const testTask = (db, data) => {
    if(!(taskArray.get(Number(data.platform)) == data.bid)){
        return
    }
    let taskInfo = {
        platform: data.platform,
        bid: data.bid,
        aid: data.aid,
        taskType: 0
    }
    db.sadd('comment_task', JSON.stringify(taskInfo), (err, result) => {
        if(err){
            console.error('加入缓存队列出现错误：', err.message)
            return
        }
        console.log(`加入缓存队列`)
        taskInfo = null
    })
}

/**
 * 将媒体（视频）信息或评论信息保存到缓存队列
 * @param db redis数据库
 * @param listsName 队列名称
 * @param data 数据 Object
 */
exports.saveCache = (db, listsName, data) => {
    db.rpush(listsName, JSON.stringify(data), (err, result) => {
        if(err){
            console.error('加入缓存队列出现错误：', err.message)
            return
        }
        console.log((data.cid ? `评论信息: ${data.cid} ` : `视频信息: ${data.aid} ` ) + `加入缓存队列`)
        testTask(db,data)
        data = null
    })
}

/**
 * 记录被封禁账号和找不到的账号
 * @param db
 * @param data
 */
exports.banned = (db, data) => {
    db.zscore('channel:banned', data, (err, result) => {
        if(err)return
        if(!result){
            db.zadd('channel:banned', -1, data)
        }
    })
}


