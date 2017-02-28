const request = require('request')
const vm = require('vm')
const sandbox = {
    jsonp: function (data) {
        return data
    }
}
exports.youku = (user) => {
    return new Promise((resolve, reject)=>{
        let options = {
            method: 'POST',
            url: `https://openapi.youku.com/v2/users/show.json`,
            form: {
                client_id: 'c9e697e443715900',
                user_id: user.bid
            }
        }
        request(options, (error, response, body) => {
            if(error){
                return reject(error.message)
            }
            if(response.statusCode !== 200){
                return reject(response.statusCode)
            }
            try{
                body = JSON.parse(body)
            } catch (e){
                return reject(e.message)
            }
            resolve({
                p: user.platform,
                id: user.bid,
                avatar: body.avatar_large
            })
        })
    })
}
exports.iqiyi = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.le = (user) => {
    return new Promise((resolve, reject)=>{
        let url = `http://api.chuang.letv.com/outer/ugc/video/user/videocount?callback=jsonp&userid=${user.bid}&_=${(new Date()).getTime()}`
        request(url, (error, response, body) => {
            if(error){
                return reject(error.message)
            }
            if(response.statusCode !== 200){
                return reject(response.statusCode)
            }
            try{
                const script = new vm.Script(body)
                const context = new vm.createContext(sandbox)
                body = script.runInContext(context)
            } catch (e){
                return reject(e.message)
            }
            resolve({
                p: user.platform,
                id: user.bid,
                avatar: body.data['pic300*300']
            })
        })
    })
}
exports.tencent = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.meipai = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.toutiao = (user) => {
    return new Promise((resolve, reject)=>{
        let url = `http://lf.snssdk.com/2/user/profile/v3/?media_id=${user.bid}`
        request(url, (error, response, body) => {
            if(error){
                return reject(error.message)
            }
            if(response.statusCode !== 200){
                return reject(response.statusCode)
            }
            try{
                body = JSON.parse(body)
            } catch (e){
                return reject(e.message)
            }
            resolve({
                p: user.platform,
                id: user.bid,
                avatar: body.data.big_avatar_url
            })
        })
    })
}
exports.miaopai = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.bili = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.sohu = (user) => {
    return new Promise((resolve, reject)=>{
        let url = `http://api.tv.sohu.com/v4/user/info/${user.bid}.json?api_key=f351515304020cad28c92f70f002261c&_=${(new Date()).getTime()}`
        request(url, (error, response, body) => {
            if(error){
                return reject(error.message)
            }
            if(response.statusCode !== 200){
                return reject(response.statusCode)
            }
            try{
                body = JSON.parse(body)
            } catch (e){
                return reject(e.message)
            }
            resolve({
                p: user.platform,
                id: user.bid,
                avatar: body.data.bg_pic
            })
        })
    })
}
exports.kuaibao = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.yidian = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.tudou = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.baomihua = (user) => {
    return new Promise((resolve, reject)=>{
        let url = `http://m.interface.baomihua.com/interfaces/userchannel.ashx?channelid=${user.bid}&type=channelinfo`
        request(url, (error, response, body) => {
            if(error){
                return reject(error.message)
            }
            if(response.statusCode !== 200){
                return reject(response.statusCode)
            }
            try{
                body = JSON.parse(body)
            } catch (e){
                return reject(e.message)
            }
            resolve({
                p: user.platform,
                id: user.bid,
                avatar: body.result.ChannelInfo.MidPic
            })
        })
    })
}
exports.ku6 = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.btime = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.weishi = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.xiaoying = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.budejie = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.neihan = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.yy = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.tv56 = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.acfun = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.weibo = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.ifeng = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.wangyi = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.uctt = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.mgtv = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.baijia = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.qzone = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.cctv = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.xinlan = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.v1 = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.fengxing = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.huashu = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.baofeng = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.baiduVideo = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}
exports.pptv = (user) => {
    return new Promise((resolve, reject)=>{
        reject('未完成')
    })
}