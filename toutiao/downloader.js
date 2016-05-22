/**
 * Created by junhao on 16/4/7.
 */
var util = require( 'util' )
var urlUtil = require( "url" )
var https = require( 'https' )
var BufferHelper = require( 'bufferhelper' )
var iconv = require( 'iconv-lite' )
try {
    var unzip = require( 'zlib' ).unzip;
} catch (e) { /* unzip not supported */
}

var logger
var settings

var downloader = function ( spiderCore ) {
    'use strict'
    this.spiderCore = spiderCore;
    logger = spiderCore.settings.logger
    settings = spiderCore.settings
    logger.debug( '下载器 实例化...' )
}

downloader.prototype.download = function ( url ,callback) {
    'use strict'
    var spiderCore = this.spiderCore, self = this,mediaData
    var urlobj = urlUtil.parse(url),
        __host = urlobj['hostname'],
        __port = urlobj['port'],
        __path = urlobj['path']

    var options = {
        'host': __host,
        'port': __port,
        'path': __path,
        'method': 'GET',
        'headers': {
            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36",
            "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding":"gzip,deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Cookie":settings.cookie,
            "DNT":1,
            "Host":"mp.toutiao.com",
            "Pragma":"no-cache",
            "Upgrade-Insecure-Requests":1
        }
    }
    //logger.debug( util.format( '发出请求, %s', url ) )
    var req = https.request(options,function (res) {
        //logger.debug( util.format( '收到回复, %s', url ) )
        if(res.statusCode != 200){
            logger.debug(res.statusCode)
            logger.debug(res.headers.location)
            return callback(null,res.statusCode)
            //return
        }
        var compressed = /gzip|deflate/.test( res.headers[ 'content-encoding' ] )
        var bufferHelper = new BufferHelper()
        res.on('data', function (chunk) {
            bufferHelper.concat(chunk);
        })
        res.on( 'end', function ( chunk ) {
            var page_encoding = self.get_page_encoding( res.headers );//获取头文件里面的编码 如果有的话；没有会返回 默认值 UTF-8 这里转码有问题
            page_encoding = page_encoding.toLowerCase().replace( '-', '' );//小写 修正格式
            if ( !compressed || typeof unzip == 'undefined' ) {//如果没压缩 或者 unzip 不被支持 unzip是require npm 一个 包
                mediaData = iconv.decode( bufferHelper.toBuffer(), page_encoding );//page_encoding 否则开始解码
                //logger.debug("1",mediaData)
                callback(null,mediaData)
            } else {//如果压缩了的话
                unzip( bufferHelper.toBuffer(), function ( err, buff ) { // 那只好解压缩了  这种情况应该会比较多，因为绝大部分网站会都开启zip压缩
                    if ( !err && buff ) {//如果没有错误且拿到解压缩的buff的话，开始处理内容
                        mediaData = iconv.decode( buff, page_encoding );//否则就转码
                        //logger.debug("2",mediaData)
                        callback(null,mediaData)
                        return
                    } else {
                        callback(err,null)
                        return
                    }
                } );
            }
        })
    })
    req.on( 'error', function ( e ) {//出现错误的处理机制
        logger.error( 'problem with request: ' + e.message + ', url:' + url );
        if ( req ) {
            req = null
            callback(err,null)
            return
        }
    } )
    req.end()
}

/**
 * get page encoding
 * 获取头文件里面的编码设置
 * @returns {string}
 */
downloader.prototype.get_page_encoding = function ( header ) {
    'use strict';
    var page_encoding = 'UTF-8';
    //get the encoding from header
    if ( header[ 'content-type' ] != undefined ) {//如果头文件 编码信息存在
        var contentType = header[ 'content-type' ];//获取出来
        var patt = new RegExp( "^.*?charset\=(.+)$", "ig" );//开启正则表达式去测试
        var mts = patt.exec( contentType );//返回结果 结果时数组 如果没有结果的话 那么会时null
        if ( mts != null )//如果有结果
        {
            page_encoding = mts[ 1 ];//取出结果
        }
    }
    return page_encoding;// 返回结果
}
module.exports = downloader