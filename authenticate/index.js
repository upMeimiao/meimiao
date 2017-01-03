const HTTP = require('http')
const URL = require('url')
const Handle = require( './handle' )

let logger,handle
class spiderCore {
    constructor( settings) {
        this.settings = settings
        this.port = settings.port
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
        server.listen(this.port, () => {
            logger.debug(`Server running at ${this.port} port`)
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
        res.setHeader('Access-Control-Allow-Origin','*')
        const query = URL.parse(req.url,true).query
        logger.debug('请求'+req)
        if(!query.url && !query.code){
            res.writeHead(400,{'Content-Type': 'text/html;charset=utf-8'})
            res.end('请检查url参数与code参数')
            return
        }
        const verifyData = {
            remote: query.url,
            verifyCode: query.code
        }
        console.log(verifyData)
        const hostname = URL.parse(query.url,true).hostname,
            ctx = { req, res }
        switch (hostname){
            case 'v.youku.com':
                handle.youkuHandle( ctx, verifyData )
                break
            case 'www.iqiyi.com':
                handle.iqiyiHandle( ctx, verifyData )
                break
            case 'www.le.com':
                handle.leHandle( ctx, verifyData )
                break
            case 'v.qq.com':
                handle.tencentHandle( ctx, verifyData )
                break
            case 'www.meipai.com':
            case 'meipai.com':
                handle.meipaiHandle( ctx, verifyData )
                break
            case 'www.toutiao.com':
            case 'toutiao.com':
            case 'm.toutiao.com':
                handle.toutiaoHandle( ctx, verifyData )
                break
            case 'www.miaopai.com':
            case 'm.miaopai.com':
                handle.miaopaiHandle( ctx, verifyData )
                break
            case 'www.bilibili.com':
            case 'bilibili.com':
                handle.biliHandle( ctx, verifyData )
                break
            case 'my.tv.sohu.com':
            case 'tv.sohu.com':
                handle.sohuHandle( ctx, verifyData )
                break
            case 'kuaibao.qq.com':
            case 'kb.qq.com':
                handle.kuaibaoHandle( ctx, verifyData )
                break
            case 'www.yidianzixun.com':
                handle.yidianHandle( ctx, verifyData )
                break
            case 'www.tudou.com':
                handle.tudouHandle( ctx, verifyData )
                break
            case 'www.baomihua.com':
            case 'baomihua.com':
            case 'video.baomihua.com':
                handle.baomihuaHandle( ctx, verifyData )
                break
            case 'v.ku6.com':
                handle.ku6Handle( ctx, verifyData )
                break
            case 'record.btime.com':
            case 'video.btime.com':
            case 'item.btime.com':
                handle.btimeHandle( ctx, verifyData )
                break
            case 'www.weishi.com':
            case 'weishi.com':
            case 'weishi.qq.com':
                handle.weishiHandle( ctx, verifyData )
                break
            case 'xiaoying.tv':
                handle.xiaoyingHandle( ctx, verifyData )
                break
            case 'www.budejie.com':
            case 'a.f.budejie.com':
            case 'm.budejie.com':
                handle.budejieHandle( ctx, verifyData )
                break
            case 'm.neihanshequ.com':
            case 'neihanshequ.com':
                handle.neihanHandle( ctx, verifyData )
                break
            case 'w.3g.yy.com':
            case 'shenqu.3g.yy.com':
            case 'www.yy.com':
                handle.yyHandle( ctx, verifyData )
                break
            case 'www.56.com':
            case 'm.56.com':
            case 'wx.m.tv.sohu.com':
            case 'm.tv.sohu.com':
                handle.tv56Handle( ctx, verifyData )
                break
            case 'www.acfun.tv':
            case 'm.acfun.tv':
                handle.acfunHandle( ctx, verifyData )
                break
            case 'tc.uc.cn':
            case 'm.uczzd.cn':
            case 'v.mp.uc.cn':
                handle.ucHandle( ctx, verifyData )
                break
            case 'v.ifeng.com':
                handle.ifengHandle( ctx, verifyData )
                break
            case 'v.163.com':
            case 'c.m.163.com':
                handle.wangyiHandle( ctx, verifyData )
                break
            case 'user.qzone.qq.com':
            case 'mobile.qzone.qq.com':
            case 'h5.qzone.qq.com':
            case 'url.cn':
                handle.QQqzoneHandle( ctx, verifyData )
                break
            case 'www.mgtv.com':
            case 'm.mgtv.com':
                handle.mgtvHandle( ctx, verifyData )
                break
            case 'weibo.cn':
            case 'm.weibo.cn':
            case 'weibo.com':
                handle.weiboHandle( ctx, verifyData )
                break
            case 'tv.cztv.com':
            case 'm.tv.cztv.com':
                handle.xinlanHandle( ctx, verifyData )
                break
            case 'xiyou.cctv.com':
            case 'xiyou.cctv.cn':
                handle.cctvHandle( ctx, verifyData )
                break
            case 'www.v1.cn':
            case 'm.v1.cn':
                handle.v1Handle( ctx, verifyData )
                break
            case 'www.fun.tv':
            case 'pm.funshion.com':
            case 'm.fun.tv':
                handle.fengxingHandle( ctx, verifyData )
                break
            case 'www.wasu.cn':
                handle.huashuHandle( ctx, verifyData )
                break
            default:
                res.setHeader('Content-Type',`text/plain;charset=utf-8`)
                res.writeHead(200)
                res.end(JSON.stringify({errno:100,errmsg:'暂不支持该平台或该URL非合法校验地址'}))
                return
        }
    }
}
module.exports = spiderCore