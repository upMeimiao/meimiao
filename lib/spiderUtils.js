/**
 * 删除对象中值为null的属性
 * @param obj
 */
exports.deleteProperty = (obj) => {
    if(typeof obj !== 'object' || Object.prototype.toString.call(obj) === '[object Array]'){
        //非对象（数组也不可以）调用，直接返回该数据  PS：把调用者拖出去吧
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
 */
exports.stringHandling = (str, length) => {
    if(typeof str !== 'string'){
        //非字符串调用，直接返回该数据  PS：调用者需要做检讨
        return str
    }
    str = str.replace(/"/g,'')
    if(length && length > 0){
        str = str.substr(0,Number(length))
    }
    return str
}

/**
 * 对抓取到的数字(应该是数字的字符串/字段)进行判断与容错处理
 * @param num
 */
exports.numberHandling = (num) => {
    if(typeof num !== 'string' && typeof num !== 'number'){
        //非字符串或数字调用，直接返回该数据  PS：调用者需要做检讨
        return num
    }
    if(isNaN(num) && num.includes('万')){
        return Number(num.replace('万','') * 10000)
    }
    if(isNaN(num) && num.includes('亿')){
        return Number(num.replace('亿','') * 100000000)
    }
    return Number(num)
}