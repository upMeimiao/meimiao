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
            data = JSON.parse( data )
            casper.emit( 'feedback',data)
        } else {
            feedback += data
            casper.emit( 'feedback',feedback)
        }
    } )

    casper.stdout.on( 'message', function ( data ) {
        console.log( '收到来自子进程的消息')
    } )


    casper.on( 'feedback', function ( _data ) {
        // 返回数据
        console.log(_data)
        //casper.kill()
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