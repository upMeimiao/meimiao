/**
 * Created by ifable on 16/5/22.
 */
var child_process = require( 'child_process' )
require( './../lib/jsextend.js' )
var rest = require( 'restler' )
var fs = require( 'fs' )

var settings
var logger

var login = function ( spiderCore ) {
    'use strict'
    this.spiderCore = spiderCore
    settings = spiderCore.settings
    logger = settings.logger
    this.need = settings.login.need
    this.username = settings.login.username
    this.password = settings.login.password
    this.loginAddr = settings.login.loginAddr
    this.usernameInput = settings.login.usernameInput
    this.passwordInput = settings.login.passwordInput
    logger.debug( '登录模块 实例化...' )
}
/**
 * 实际在做登录操作的函数
 * @param callback
 */
login.prototype.do = function ( retry, callback ) {
    'use strict'
    if (retry > 3) {
        return callback(false)
    }
    var spiderCore = this.spiderCore
    var self = this
    var id
    // 开始登录
    logger.debug('开始登录')
    var casper = child_process.spawn( 'casperjs',
        ['./toutiao/casper.js',self.username, self.password, self.loginAddr, self.usernameInput, self.passwordInput ],
        {
            'stdio' : [ 'pipe', 'pipe', 'pipe' ]
        }
    )
    casper.stdin.setEncoding( 'utf8' )
    casper.stdout.setEncoding( 'utf8' )
    casper.on( 'error', function ( err ) {
        console.log( 'err', err );
    })
    var feedback = ''
    var data = ''
    casper.stdout.on( 'data', function ( chunk ) {
        data += chunk
        if ( data.indexOf( '_end_' ) !== -1 ) {
            // 请求发布完成
            data = data.replace( '_end_', '' )
            try {
                data = JSON.parse( data );
            } catch (e) {
                logger.error( '子进程返回json数据解析失败' );
                logger.error(data);
            }
            if ( data.action === 'ask' ) {
                data = '';
                logger.debug( '收到cookie请求' );
            } else if ( data.action === 'report' ) {
                logger.debug( '收到cookie结果' );
                casper.emit( 'feedback', data );
                data = '';
            } else {
                logger.info( data );
                data = '';
            }
        } else {
            feedback += data;
            if ( data.endsWith( '}#^_^#' ) ) {
                var emit_string = feedback.slice( 0, -5 );
                feedback = '';
                casper.emit( 'feedback', emit_string );
            }
        }
    } )

    casper.stdout.on( 'message', function ( data ) {
        console.log( '收到来自子进程的消息')
    } )


    casper.on( 'feedback', function ( _data ) {
        // 返回数据
        if ( data.status ) {
            // 正确获取到结果
            return callback( null, data );
        } else {
            logger.error( '未能成功登录' );
            logger.error( 'step:', data.step );
            if ( data.result.reason === '验证码错误' ) {
                // 验证码错误

                logger.error( data.result.reason );
                // 发送错误信息
                self.captchaError( id, function ( err, result ) {
                    if ( err ) {
                        logger.error( '向服务器报告验证码错误出现问题' );
                        // 重新来过
                        casper.kill();
                        return self.do( retry + 1, callback );
                    }
                    logger.info( '服务器返回:', result );
                    // 重新来过
                    casper.kill();
                    return self.do( retry + 1, callback );
                } );
            } else if ( data.result.reason === '您输入的密码和账户名不匹配' ) {
                // 账号密码错误是严重错误
                // 需要上报错误
                casper.kill();
                logger.error( '账号密码不正确' );
                process.exit();
            } else {
                // 未知错误
                casper.kill();
                logger.error( data.result.reason );
                return self.do( retry + 1, callback );
            }
        }
    } )
}
/**
 * 登录模块
 * @param callback
 * @returns {*}
 */
login.prototype.assembly = function ( callback ) {
    'use strict'
    var self = this
    // 需要登录才会登录
    if ( this.need === 'true' || this.need === true || this.need === 1 || this.need === '1' ) {
        self.do( 0, function ( err, result ) {
            if ( err ) {
                return callback( err, result )
            }
            logger.debug( result.result.cookie )
            self.spiderCore.cookie = result.result.cookie
            return callback( null, true )
        } )
    } else {
        return callback( null, true )
    }
}
module.exports = login