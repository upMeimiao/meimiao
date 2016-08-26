const HTTP = require('http')
const URL = require('url')
const request = require( 'request' )

let logger
class spiderCore {
    constructor (settings){
        this.settings = settings
        this.port = settings.listen.port
        this.ip = settings.listen.ip
        this.deal = new (require('./deal'))(this)
        logger = settings.logger
        logger.debug('控制器实例化')
    }
    start(){
        const server = HTTP.createServer((req, res) => {
            res.writeHead(200, {
                'Access-Control-Allow-Origin':'*',
                'Content-Type': 'text/plain;charset=utf-8'
            })
            if(req.url =='/favicon.ico')return
            let query = URL.parse(req.url,true).query
            this.preDeal(query,(err,data) => {
                if(!data.errno){
                    data = {
                        errno: 0,
                        errmsg: '获取信息成功',
                        data: {
                            platform: data.p,
                            bid: data.id,
                            bname: data.name,
                            type: data.type ? data.type : 0,
                            encodeId: data.encode_id ? data.encode_id : ''
                        }
                    }
                }
                res.end(JSON.stringify(data))
                // this.send(data)
            })
        })
        server.listen(this.port, this.ip, () => {
            logger.debug(`Server running at ${this.ip}:${this.port}`)
        })
    }
    send(data){
        let options = {
            method : 'POST',
            url: this.settings.server,
            form : data.data
        }
        request.post( options, ( err, res, body ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return
            }
            if(res.statusCode != 200 ){
                logger.error( `状态码${res.statusCode}` )
                logger.info( res )
                return
            }
            try {
                body = JSON.parse( body )
            } catch (e) {
                logger.info( '不符合JSON格式' )
                return
            }
            if(body.errno == 0){
                logger.info(body.errmsg)
            }else{
                logger.info(body)
            }
        })
    }
    preDeal(data,callback){
        let url = data.url,
            hostname = URL.parse(url,true).hostname
        switch (hostname){
            case 'v.youku.com':
                this.deal.youku(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:1}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.bilibili.com':
            case 'bilibili.com':
                this.deal.bili(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:8}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.meipai.com':
            case 'meipai.com':
                this.deal.meipai(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:5}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.miaopai.com':
            case 'm.miaopai.com':
                if(!((url.includes('.htm') && url.includes('/show/')) || url.includes('/show/channel/'))){
                    return callback(null,{errno:101,errmsg:'该URL不是合法播放页地址',data:{platform:7}})
                }
                this.deal.miaopai(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:7}})
                    }
                    return callback(null,result)
                })
                break
            case 'my.tv.sohu.com':
                this.deal.souhu(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:9}})
                    }
                    return callback(null,result)
                })
                break
            case 'kuaibao.qq.com':
                this.deal.kuaibao(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:10}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.iqiyi.com':
                this.deal.iqiyi(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:2}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.le.com':
                this.deal.le(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:3}})
                    }
                    return callback(null,result)
                })
                break
            case 'v.qq.com':
                this.deal.tencent(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:4}})
                    }
                    return callback(null,result)
                })
                break
            case 'toutiao.com':
            case 'm.toutiao.com':
                this.deal.toutiao(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:6}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.yidianzixun.com':
                this.deal.yidian(url,(err,result) => {
                    if(err){
                        if(err == 101){
                            return callback(null,{errno:101,errmsg:'该URL不是合法播放页地址',data:{platform:11}})
                        }
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:11}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.tudou.com':
                this.deal.tudou(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:12}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.baomihua.com':
            case 'baomihua.com':
            case 'video.baomihua.com':
                this.deal.baomihua(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:13}})
                    }
                    return callback(null,result)
                })
                break
            case 'v.ku6.com':
                this.deal.ku6(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:14}})
                    }
                    return callback(null,result)
                })
                break
            case 'record.btime.com':
            case 'video.btime.com':
                this.deal.btime(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:15}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.weishi.com':
            case 'weishi.com':
            case 'weishi.qq.com':
                this.deal.weishi( url, ( err, result ) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:16}})
                    }
                    return callback(null,result)
                })
                break
            case 'xiaoying.tv':
                this.deal.xiaoying(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:17}})
                    }
                    return callback(null,result)
                })
                break
            case 'www.budejie.com':
            case 'a.f.budejie.com':
            case 'm.budejie.com':
                this.deal.budejie(url,(err,result) => {
                    if(err){
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:18}})
                    }
                    return callback(null,result)
                })
                break
            case 'm.neihanshequ.com':
            case 'neihanshequ.com':
                this.deal.neihan(url,(err,result) => {
                    if(err){
                        if(err == 101){
                            return callback(null,{errno:101,errmsg:'该URL不是合法播放页地址',data:{platform:19}})
                        }
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:19}})
                    }
                    return callback(null,result)
                })
                break
            case 'w.3g.yy.com':
            case 'shenqu.3g.yy.com':
            case 'www.yy.com':
                this.deal.yy(url,(err,result) => {
                    if(err){
                        if(err == 101){
                            return callback(null,{errno:101,errmsg:'该URL不是合法播放页地址',data:{platform:20}})
                        }
                        return callback(null,{errno:102,errmsg:'获取信息过程出错',data:{platform:20}})
                    }
                    return callback(null,result)
                })
                break
            default:
                return callback(null,{errno:100,errmsg:'暂不支持该平台或该URL不是播放页地址'})
        }
    }
}
module.exports = spiderCore