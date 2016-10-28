const HTTP = require('http')
const URL = require('url')
const Handle = require( './handle' )

let logger,handle
class spiderCore {
    constructor( settings) {
        this.settings = settings
        this.port = settings.port
        this.ip = settings.listen.ip
        logger = this.settings.logger
        handle = new Handle( this )
        logger.debug('server实例化')
    }
    start () {
        const server = HTTP.createServer((req, res) => {
            switch ( req.method ){
                case 'GET':
                    this.getHandle( req, res )
                    break
                default:
                    res.setHeader('Content-Type',`text/html;charset=utf-8`)
                    res.writeHead(400)
                    res.end()
                    break
            }
        })
        server.listen(this.port, this.ip, () => {
            logger.debug(`Server running at ${this.ip}:${this.port}`)
        })
    }
    getHandle ( req, res ){
        if ( req.url === '/favicon.ico' || URL.parse(req.url).pathname !== '/' ){
            res.writeHead(404,{'Content-Type': 'text/html;charset=utf-8'})
            res.end()
            return
        }
        this.dispatch( req, res )
    }
    dispatch ( req, res ) {
        const query = URL.parse(req.url,true).query
        if(!query.url){
            res.writeHead(400,{'Content-Type': 'text/html;charset=utf-8'})
            res.end()
            return
        }
        const remote = query.url,
            hostname = URL.parse(remote,true).hostname,
            ctx = { req, res }
        switch (hostname){
            case 'v.youku.com':
                handle.youkuHandle( ctx, remote )
                break
            case 'www.iqiyi.com':
                handle.iqiyiHandle( ctx, remote )
                break
            case 'www.bilibili.com':
            case 'bilibili.com':
                break
            case 'www.meipai.com':
            case 'meipai.com':

                break
            case 'www.miaopai.com':
            case 'm.miaopai.com':
                break
            case 'my.tv.sohu.com':
                break
            case 'kuaibao.qq.com':
                break

            case 'www.le.com':
                break
            case 'v.qq.com':
                break
            case 'www.toutiao.com':
            case 'toutiao.com':
            case 'm.toutiao.com':
                break
            case 'www.yidianzixun.com':
                break
            case 'www.tudou.com':
                break
            case 'www.baomihua.com':
            case 'baomihua.com':
            case 'video.baomihua.com':
                break
            case 'v.ku6.com':
                break
            case 'record.btime.com':
            case 'video.btime.com':
            case 'item.btime.com':

                break
            case 'www.weishi.com':
            case 'weishi.com':
            case 'weishi.qq.com':
                break
            case 'xiaoying.tv':

                break
            case 'www.budejie.com':
            case 'a.f.budejie.com':
            case 'm.budejie.com':

                break
            case 'm.neihanshequ.com':
            case 'neihanshequ.com':

                break
            case 'w.3g.yy.com':
            case 'shenqu.3g.yy.com':
            case 'www.yy.com':

                break
            case 'www.56.com':
            case 'm.56.com':

                break
            case 'www.acfun.tv':
            case 'm.acfun.tv':

                break
            default:
                res.setHeader('Content-Type',`text/plain;charset=utf-8`)
                res.writeHead(200)
                res.end(JSON.stringify({errno:100,errmsg:'暂不支持该平台或该URL不是播放页地址'}))
                return
        }
    }
}
module.exports = spiderCore