const HTTP = require('http')
const URL = require('url')

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
                'Content-Type': 'text/plain;charset=utf-8'
            })
            if(req.url =='/favicon.ico')return
            let query = URL.parse(req.url,true).query
            this.preDeal(query,(err,data) => {
                res.end(JSON.stringify(data))
            })
        })
        server.listen(this.port, this.ip, () => {
            logger.debug(`Server running at ${this.ip}:${this.port}`)
        })
    }
    preDeal(data,callback){
        let url = data.url, 
            hostname = URL.parse(url,true).hostname
        switch (hostname){
            case 'v.youku.com':
                this.deal.youku(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'www.bilibili.com':
            case 'bilibili.com':
                this.deal.bili(url,(err,result) => {
                    if(err){
                    }
                    return callback(null,result)
                })
                break
            case 'www.meipai.com':
            case 'meipai.com':
                this.deal.meipai(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'www.miaopai.com':
            case 'm.miaopai.com':
                this.deal.miaopai(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'tv.sohu.com':
                this.deal.souhu(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'kuaibao.qq.com':
                this.deal.kuaibao(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'www.iqiyi.com':
                this.deal.iqiyi(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'www.le.com':
                this.deal.le(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'v.qq.com':
                this.deal.tencent(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'toutiao.com':
                this.deal.toutiao(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'www.yidianzixun.com':
                this.deal.yidian(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'www.tudou.com':
                this.deal.tudou(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'www.baomihua.com':
            case 'baomihua.com':
            case 'video.baomihua.com':
                this.deal.baomihua(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'v.ku6.com':
                this.deal.ku6(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            case 'record.btime.com':
                this.deal.btime(url,(err,result) => {
                    if(err){

                    }
                    return callback(null,result)
                })
                break
            default:
                return callback(null,{code:1001,msg:'暂不支持该平台'})
        }
    }
}
module.exports = spiderCore