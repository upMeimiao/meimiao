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
        // switch (hostname){
        //     case 'v.youku.com':
        //         break
        //     case 'www.bilibili.com':
        //     case 'bilibili.com':
        //         break
        //     default:
        //         return callback(null,{msg:'暂不支持该平台'})
        // }
        if(hostname.endsWith('youku.com')){
            this.deal.youku(url,(err,result) => {
                if(err){
                    
                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('bilibili.com')){
            this.deal.bili(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('meipai.com')){
            this.deal.meipai(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('miaopai.com')){
            this.deal.miaopai(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('tv.sohu.com')){
            this.deal.souhu(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('kuaibao.qq.com')){
            this.deal.kuaibao(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('iqiyi.com')){
            this.deal.iqiyi(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('le.com')){
            this.deal.le(url,(err,result) => {
                if(err){
                    
                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('v.qq.com')){
            this.deal.tencent(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('toutiao.com')){
            this.deal.toutiao(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('kuaishou.com') || hostname.endsWith('gifshow.com')){
            this.deal.kuaishou(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('yidianzixun.com')){
            this.deal.yidian(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
        if(hostname.endsWith('tudou.com')){
            this.deal.tudou(url,(err,result) => {
                if(err){

                }
                return callback(null,result)
            })
        }
    }
}
module.exports = spiderCore