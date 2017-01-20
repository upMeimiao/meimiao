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
            case 'www.le.com':
                handle.leHandle( ctx, remote )
                break
            case 'v.qq.com':
                handle.tencentHandle( ctx, remote )
                break
            case 'www.meipai.com':
            case 'meipai.com':
                handle.meipaiHandle( ctx, remote )
                break
            case 'www.toutiao.com':
            case 'toutiao.com':
            case 'm.toutiao.com':
            case 'www.365yg.com':
                handle.toutiaoHandle( ctx, remote )
                break
            case 'www.miaopai.com':
            case 'm.miaopai.com':
                handle.miaopaiHandle( ctx, remote )
                break
            case 'www.bilibili.com':
            case 'bilibili.com':
                handle.biliHandle( ctx, remote )
                break
            case 'my.tv.sohu.com':
                handle.sohuHandle( ctx, remote )
                break
            case 'kuaibao.qq.com':
                handle.kuaibaoHandle( ctx, remote )
                break
            case 'www.yidianzixun.com':
                handle.yidianHandle( ctx, remote )
                break
            case 'www.tudou.com':
                handle.tudouHandle( ctx, remote )
                break
            case 'www.baomihua.com':
            case 'baomihua.com':
            case 'video.baomihua.com':
                handle.baomihuaHandle( ctx, remote )
                break
            case 'v.ku6.com':
                handle.ku6Handle( ctx, remote )
                break
            case 'record.btime.com':
            case 'video.btime.com':
            case 'item.btime.com':
            case 'p.m.btime.com':
            case 'new.item.btime.com':
                handle.btimeHandle( ctx, remote )
                break
            case 'www.weishi.com':
            case 'weishi.com':
            case 'weishi.qq.com':
                handle.weishiHandle( ctx, remote )
                break
            case 'xiaoying.tv':
                handle.xiaoyingHandle( ctx, remote )
                break
            case 'www.budejie.com':
            case 'a.f.budejie.com':
            case 'm.budejie.com':
                handle.budejieHandle( ctx, remote )
                break
            case 'm.neihanshequ.com':
            case 'neihanshequ.com':
                handle.neihanHandle( ctx, remote )
                break
            case 'w.3g.yy.com':
            case 'shenqu.3g.yy.com':
            case 'www.yy.com':
                handle.yyHandle( ctx, remote )
                break
            case 'www.56.com':
            case 'm.56.com':
                handle.tv56Handle( ctx, remote )
                break
            case 'www.acfun.tv':
            case 'm.acfun.tv':
            case 'www.acfun.cn':
            case 'm.acfun.cn':
                handle.acfunHandle( ctx, remote )
                break
            case 'www.weibo.com':
            case 'weibo.com':
            case 'm.weibo.cn':
                handle.weiboHandle( ctx, remote )
                break
            case 'www.ifeng.com':
            case 'v.ifeng.com':
            case 'vcis.ifeng.com':
                handle.ifengHandle( ctx, remote )
                break
            case 'www.163.com':
            case 'v.163.com':
            case 'c.m.163.com':
                handle.wangyiHandle(ctx, remote)
                break
            case 'tc.uc.cn':
            case 'm.uczzd.cn':
            case 'v.mp.uc.cn':
            case 'a.mp.uc.cn':
                handle.ucHandle( ctx, remote )
                break
            case 'www.mgtv.com':
            case 'm.mgtv.com':
                handle.mgtvHandle( ctx, remote )
                break
            case 'user.qzone.qq.com':
            case 'mobile.qzone.qq.com':
            case 'h5.qzone.qq.com':
            case 'url.cn':
                handle.qzoneHandle( ctx, remote )
                break
            case 'xiyou.cctv.com':
            case 'xiyou.cntv.cn':
                handle.cctvHandle( ctx, remote )
                break
            case 'v.pptv.com':
                handle.pptvHandle( ctx, remote )
                break
            case 'm.tv.cztv.com':
            case 'tv.cztv.com':
                handle.xinlanHandle( ctx, remote )
                break
            case 'www.v1.cn':
            case 'm.v1.cn':
                handle.v1Handle( ctx, remote )
                break
            case 'www.fun.tv':
            case 'pm.funshion.com':
            case 'm.fun.tv':
                handle.fengxingHandle( ctx, remote )
                break
            case 'www.wasu.cn':
                handle.huashuHandle( ctx, remote )
                break
            case 'www.baofeng.com':
            case 'm.baofeng.com':
                handle.baofengHandle( ctx, remote )
                break
            case 'baishi.baidu.com':
            case 'baidu.56.com':
                handle.baiduHandle( ctx, remote )
                break
            case 'po.baidu.com':
            case 'baijiahao.baidu.com':
                handle.baijiaHandle( ctx, remote )
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