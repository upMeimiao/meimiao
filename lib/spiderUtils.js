/**
 * 删除对象中值为null的属性
 * @param obj
 */
exports.deleteProperty = (obj) => {
    let {keys, values, entries} = Object
    for (let [key, value] of entries(obj)) {
        if(value === null || value === undefined){
            delete obj[key]
        }
    }
    return obj
}

/**
 * 对抓取到的字符串（视频标题、视频详情、评论内容等）进行截取与特定字符的删除
 * @param str
 * @param length
 */
exports.stringHandling = (str, length) => {
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
    if(isNaN(num) && num.includes('万')){
        return Number(num.replace('万','') * 10000)
    }
    if(isNaN(num) && num.includes('亿')){
        return Number(num.replace('亿','') * 100000000)
    }
    return Number(num)
}