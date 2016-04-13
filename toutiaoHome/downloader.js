var util = require( 'util' );
var urlUtil = require( "url" );
var redis = require( "redis" );
var events = require( 'events' );
var child_process = require( 'child_process' );
var path = require( 'path' );
var http = require( 'http' );
var https = require( 'https' );
require( '../lib/jsextend.js' );
var iconv = require( 'iconv-lite' );
var BufferHelper = require( 'bufferhelper' );
var async = require( 'async' );

try {
    var unzip = require( 'zlib' ).unzip;
} catch (e) { /* unzip not supported */
}

var logger;
var settings;

//command signal defined
var CMD_SIGNAL_CRAWL_SUCCESS = 1;
var CMD_SIGNAL_CRAWL_FAIL = 3;
var CMD_SIGNAL_NAVIGATE_EXCEPTION = 2;

var downloader = function ( spiderCore ) {
    'use strict';

    events.EventEmitter.call( this );//eventemitter inherits
    this.spiderCore = spiderCore;
    this.timeout_count = 0;
    logger = spiderCore.settings.logger;
    settings = spiderCore.settings;
    logger.debug( '下载器 实例化...' );
};
util.inherits( downloader, events.EventEmitter );//eventemitter inherits
downloader.prototype.assembly = function ( callback ) {
    'use strict';
    callback( null, 'done' );
};
downloader.prototype.download = function ( taskInfo ) {
    'use strict';
    if ( taskInfo.jshandle ) {
        this.browseIt( taskInfo );
    }//如果设置了 需要加载js 那么调用 browseIt 函数
    else {
        this.downloadIt( taskInfo );
    }// 如果没有设置 就直接下载
};
downloader.prototype.transCookieKvPair = function(json){
    var kvarray = [];
    for(var i=0; i<json.length; i++){
        kvarray.push(json[i]['name']+'='+json[i]['value']);
    }
    return kvarray.join(';');
}
downloader.prototype.downloadIt = function ( urlinfo ) {
    var self = this;
    self.downloadItAct( urlinfo );
};
/**
 * download page action use http request
 * 自己的下载器
 */
downloader.prototype.downloadItAct = function ( taskInfo ) {
    'use strict';
    var spiderCore = this.spiderCore;
    var self = this;
    var timeOuter = false;
    var pageLink = taskInfo.redirect ? taskInfo.redirect : taskInfo.url;
    var useProxy = taskInfo.use_proxy ? true : false;
    var __host, __port, __path;
    // 记录开始时间
    //var startTime = new Date();
    // 保存
    //taskInfo.start_time = startTime;
    if(useProxy){
        logger.debug( '使用代理' );
        logger.debug( '开始请求代理...' );
        spiderCore.proxy.need( 0 , function ( err, proxy ) {
            if ( err ) {
                // TODO
                logger.error( '代理中心 出现错误' );
            }
            var _proxy = proxy.split(':');
            __host = _proxy[0];
            __port = _proxy[1];
            __path = pageLink;
            //proxy.action = 0;
            // 记录开始时间
            var startTime = new Date();
            // 保存
            taskInfo.start_time = startTime;
            var options = {
                'host' : __host,
                'port' : __port,
                'path' : __path,
                'method' : 'GET',
                'headers' : {
                    "User-Agent":"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36",
                    "Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Encoding":"gzip, deflate, sdch",
                    "Accept-Language":"zh-CN,zh;q=0.8",
                    "Connection":"keep-alive",
                    "Referer" : taskInfo.referer || '',
                    "void-proxy" : taskInfo.void_proxy ? taskInfo.void_proxy : "",
                    "Cookie" : (taskInfo.cookie)//this.transCookieKvPair
                }
            };
            logger.debug( util.format( '发出请求, %s', pageLink ) );//开始
            var req = https.request( options, function ( res ) {
                var result = {
                    "remote_proxy" : res.headers.remoteproxy,
                    "drill_count" : 0,
                    "cookie" : res.headers.Cookie,
                    "url" : res.req.path, //"statusCode":res.statusCode,
                    "origin" : taskInfo
                };
                if ( result.url.startsWith( '/' ) ) {
                    result.url = urlUtil.resolve( pageLink, result.url );
                }//如果是以/开头的地址
                result.statusCode = res.statusCode;
                if ( parseInt( res.statusCode ) === 301 || parseInt( res.statusCode ) === 302 ) {//考虑跳转 面对跳转的处理逻辑 ？
                    if ( res.headers.location ) {
                        result.origin.redirect = urlUtil.resolve( pageLink, res.headers.location );
                        logger.debug( pageLink + ' 被 301 重定向到  ' + res.headers.location );
                    }
                }
                if ( parseInt( res.statusCode ) !== 200 ) {
                    // proxy.action = 0;
                    // proxy.status = false;
                    async.parallel( [ function ( cb ) {
                        logger.debug( '归还proxy:', proxy );
                        spiderCore.proxy.back( proxy,false, function () {
                            return cb( null, true );
                        } );
                    }, function ( cb ) {
                        spiderCore.task.push( taskInfo, function ( err ) {
                            if ( err ) {
                                logger.error( '任务回归队列失败' );
                                logger.error( err );
                            }
                            return cb( null, true );
                        } );
                    } ], function ( err, result ) {
                        spiderCore.emit( 'slide_queue' );
                    } );
                    return;
                }
                var compressed = /gzip|deflate/.test( res.headers[ 'content-encoding' ] );//如果代码压缩 有会返回ture 没有会返回 false
                var bufferHelper = new BufferHelper();//为转码做准备
                //        res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    bufferHelper.concat(chunk);
                });
                res.on( 'end', function ( chunk ) {
                    self.timeout_count--;
                    if ( timeOuter ) {
                        clearTimeout( timeOuter );
                        timeOuter = false;
                    }
                //计算耗时
                    result.cost = (new Date()) - startTime;
                    logger.debug( 'download ' + pageLink + ', cost:' + result.cost + 'ms' );//打印结果
                    var page_encoding = taskInfo.encoding;//获取配置
                    if ( page_encoding === 'auto' ) {//如果是解码这是成自动，那么就遵循返回的头文件
                        page_encoding = self.get_page_encoding( res.headers );//获取头文件里面的编码 如果有的话；没有会返回 默认值 UTF-8 这里转码有问题
                    }
                    page_encoding = page_encoding.toLowerCase().replace( '-', '' );//小写 修正格式
                    if ( !compressed || typeof unzip == 'undefined' ) {//如果没压缩 或者 unzip 不被支持 unzip是require npm 一个 包
                        if ( taskInfo.format == 'binary' ) {//如果要二进制文件
                            result.content = bufferHelper.toBuffer();//那么内容直接打印出来buffer
                        } else {
                            result.content = iconv.decode( bufferHelper.toBuffer(), page_encoding );//page_encoding 否则开始解码
                        }
                        spiderCore.proxy.back( proxy, function () {
                            spiderCore.emit( 'crawled', result );//转码完毕 触发采集完成事件
                            return;
                        } );
                    } else {//如果压缩了的话
                        unzip( bufferHelper.toBuffer(), function ( err, buff ) { // 那只好解压缩了  这种情况应该会比较多，因为绝大部分网站会都开启zip压缩
                            if ( !err && buff ) {//如果没有错误且拿到解压缩的buff的话，开始处理内容
                                if ( taskInfo.format == 'binary' ) {//如果需要二进制代码的话
                                    result.content = buff;//就把解压缩的二进制代码给出来
                                } else {
                                    result.content = iconv.decode( buff, page_encoding );//否则就转码
                                }
                                // 用过代理 返回代理的使用
                                //proxy.action = 0;
                                spiderCore.proxy.back( proxy, false,function () {
                                } );
                                spiderCore.emit( 'crawled', result );//转码完毕 触发采集完成事件
                                return;
                            } else {
                                //proxy.action = 0;
                                spiderCore.proxy.back( proxy, false,function () {
                                } );
                                spiderCore.emit( 'crawling_failure', taskInfo, 'unzip failure' );//如果unzip出现问题，触发报错错误事件
                                return;
                            }
                        } );
                    }
                })
            })
            timeOuter = setTimeout( function () {//这个判断相当于如果在超时的时间，req还存在的话
                if ( req ) {
                    logger.error( 'Cost ' + ((new Date()) - startTime) + 'ms download timeout, ' + pageLink );// 统计超时时间
                    req.abort();// 终止请求
                    req = null;//置空

                    // 超时？！代理不好用啊
                    //proxy.status = false;
                    spiderCore.proxy.back( proxy, false,function () {
                    } );
                    spiderCore.emit( 'crawling_failure', taskInfo, 'download timeout' );//触发超时事件
                    if ( self.timeout_count++ > spiderCore.settings.spider_concurrency ) {
                        logger.fatal( 'too much timeout, exit.' );
                        process.exit( 1 );
                    }//统计超时次数 如果超过配置里面的超时次数 就 ?
                    return;
                }
            }, spiderCore.settings[ 'download_timeout' ] * 1000 );//设置超时检测
            req.on( 'error', function ( e ) {//出现错误的处理机制
                logger.error( 'problem with request: ' + e.message + ', url:' + pageLink );
                if ( timeOuter ) {
                    clearTimeout( timeOuter );
                    timeOuter = false;
                }
                if ( req ) {
                    req.abort();
                    req = null;
                    // proxy.action = 0;
                    // proxy.status = false;
                    async.parallel( [ function ( cb ) {
                        logger.debug( '归还proxy:', proxy );
                        spiderCore.proxy.back( proxy, false,function () {
                            return cb( null, true );
                        } );
                    }, function ( cb ) {
                        spiderCore.task.push( taskInfo, function ( err ) {
                            if ( err ) {
                                logger.error( '任务回归队列失败' );
                                logger.error( err );
                            }
                            return cb( null, true );
                        } );
                    } ], function ( err, result ) {
                        spiderCore.emit( 'slide_queue' );
                    } );
                    return;
                }
            } );
            req.end();//结束 目测会销毁对象，不然超时的判断永远会生效
        } );
    }else{
        var urlobj = urlUtil.parse(pageLink);
        var __host = urlobj['hostname'];
        var __port = urlobj['port'];
        var __path = urlobj['path'];
        // 记录开始时间
        var startTime = new Date();

        // 保存
        taskInfo.start_time = startTime;
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
                "Referer":taskInfo.referer ||'',
                "Cookie":taskInfo.cookie || '',
                "DNT":1,
                "Host":"mp.toutiao.com",
                "Pragma":"no-cache",
                "Upgrade-Insecure-Requests":1
            }
        };
        logger.debug( util.format( '发出请求, %s', pageLink ) );//开始
        var req = https.request( options, function ( res ) {
            logger.debug( util.format( '收到回复, %s', pageLink ) );//收到回复
            var result = {
                "remote_proxy" : res.headers.remoteproxy,
                "drill_count" : 0,
                "cookie" : res.headers.Cookie,
                "url" : res.req.path, //"statusCode":res.statusCode,
                "origin" : taskInfo
            };
            if ( result.url.startsWith( '/' ) ) {
                result.url = urlUtil.resolve( pageLink, result.url );
            }//如果是以/开头的地址
            result.statusCode = res.statusCode;
            if ( parseInt( res.statusCode ) === 301 || parseInt( res.statusCode ) === 302 ) {//考虑跳转 面对跳转的处理逻辑 ？
                if ( res.headers.location ) {
                    result.origin.redirect = urlUtil.resolve( pageLink, res.headers.location );

                    logger.debug( pageLink + ' 被 301 重定向到  ' + res.headers.location );
                }
            }

            var compressed = /gzip|deflate/.test( res.headers[ 'content-encoding' ] );//如果代码压缩 有会返回ture 没有会返回 false

            var bufferHelper = new BufferHelper();//为转码做准备
            //        res.setEncoding('utf8');
            res.on('data', function (chunk) {
                bufferHelper.concat(chunk);
            });
            res.on( 'end', function ( chunk ) {
                self.timeout_count--;
                if ( timeOuter ) {
                    clearTimeout( timeOuter );
                    timeOuter = false;
                }

                //计算耗时
                result.cost = (new Date()) - startTime;

                logger.debug( 'download ' + pageLink + ', cost:' + result.cost + 'ms' );//打印结果

                var page_encoding = taskInfo.encoding;//获取配置

                if ( page_encoding === 'auto' ) {//如果是解码这是成自动，那么就遵循返回的头文件
                    page_encoding = self.get_page_encoding( res.headers );//获取头文件里面的编码 如果有的话；没有会返回 默认值 UTF-8 这里转码有问题
                }

                page_encoding = page_encoding.toLowerCase().replace( '-', '' );//小写 修正格式
                if ( !compressed || typeof unzip == 'undefined' ) {//如果没压缩 或者 unzip 不被支持 unzip是require npm 一个 包
                    if ( taskInfo.format == 'binary' ) {//如果要二进制文件
                        result.content = bufferHelper.toBuffer();//那么内容直接打印出来buffer
                    } else {
                        result.content = iconv.decode( bufferHelper.toBuffer(), page_encoding );//page_encoding 否则开始解码
                    }
                    spiderCore.emit( 'crawled', result );//转码完毕 触发采集完成事件
                } else {//如果压缩了的话
                    unzip( bufferHelper.toBuffer(), function ( err, buff ) { // 那只好解压缩了  这种情况应该会比较多，因为绝大部分网站会都开启zip压缩
                        if ( !err && buff ) {//如果没有错误且拿到解压缩的buff的话，开始处理内容
                            if ( taskInfo.format == 'binary' ) {//如果需要二进制代码的话
                                result.content = buff;//就把解压缩的二进制代码给出来
                            } else {
                                result.content = iconv.decode( buff, page_encoding );//否则就转码
                            }
                            spiderCore.emit( 'crawled', result );//转码完毕 触发采集完成事件
                            return;
                        } else {
                            spiderCore.emit( 'crawling_failure', taskInfo, 'unzip failure' );//如果unzip出现问题，触发报错错误事件
                            return;
                        }
                    } );
                }
            } );
        })
        timeOuter = setTimeout( function () {//这个判断相当于如果在超时的时间，req还存在的话
            if ( req ) {
                logger.error( 'Cost ' + ((new Date()) - startTime) + 'ms download timeout, ' + pageLink );// 统计超时时间
                req.abort();// 终止请求
                req = null;//置空
                spiderCore.emit( 'crawling_failure', taskInfo, 'download timeout' );//触发超时事件
                if ( self.timeout_count++ > spiderCore.settings.spider_concurrency ) {
                    logger.fatal( 'too much timeout, exit.' );
                    process.exit( 1 );
                }//统计超时次数 如果超过配置里面的超时次数 就 ?
            }
        }, spiderCore.settings[ 'download_timeout' ] * 1000 );//设置超时检测

        req.on( 'error', function ( e ) {//出现错误的处理机制
            logger.error( 'problem with request: ' + e.message + ', url:' + pageLink );
            if ( timeOuter ) {
                clearTimeout( timeOuter );
                timeOuter = false;
            }
            if ( req ) {
                req.abort();
                req = null;
                spiderCore.emit( 'crawling_failure', taskInfo, e.message );
                return;
            }
        } );
        req.end();
    }
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
};
module.exports = downloader;
