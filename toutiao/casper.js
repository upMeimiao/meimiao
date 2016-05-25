/**
 * Created by ifable on 16/5/22.
 */
var casper = require( 'casper' ).create( {
    userAgent : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36", 
    pageSettings : {
        loadImages : true
    }, 
    viewportSize : {
        width : 1280,
        height : 800
    }
} );
console.log("dd")
casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36')
var system = require( 'system' )

var sendToCaller = function ( msg ) {
    system.stdout.writeLine( JSON.stringify( msg ) + '_end_' );
};

var send = function ( msg ) {
    system.stdout.writeLine( JSON.stringify( msg ) + '_end_' );
};
var username = casper.cli.get( 0 );
var password = casper.cli.get( 1 );
var login = casper.cli.get( 2 );
var usernameInput = casper.cli.get( 3 );
var passwordInput = casper.cli.get( 4 );

// var username = 'ttkq@qwbcg.com';
// var password = 'honeytime2013';
// var login = 'https://api.weibo.com/oauth2/authorize?client_id=2504490989&response_type=code&display=desktop&state=1ba39ad9iaFhGKFwqnNpbmFfd2VpYm-hc6ChcgKhdgKhaQChaKt0b3V0aWFvLmNvbaFtAKFutWh0dHA6Ly9tcC50b3V0aWFvLmNvbQ==&redirect_uri=http://api.snssdk.com/auth/login_success/'
// var usernameInput = 'userId';
// var passwordInput = 'passwd';

var auth = {};
auth[ usernameInput ] = username;
auth[ passwordInput ] = password;


var header = {
    method : 'get',
    header : {
        ':host' : 'api.weibo.com',
        ':method':'GET',
        ':path':'/oauth2/authorize?client_id=2504490989&response_type=code&display=desktop&state=1ba39ad9iaFhGKFwqnNpbmFfd2VpYm-hc6ChcgKhdgKhaQChaKt0b3V0aWFvLmNvbaFtAKFutWh0dHA6Ly9tcC50b3V0aWFvLmNvbQ==&redirect_uri=http://api.snssdk.com/auth/login_success/',
        ':scheme':'https',
        ':version':'HTTP/1.1',
        'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding' : 'gzip, deflate, sdch',
        'Accept-Language' : 'zh-CN,zh;q=0.8',
        'Cache-Control' : 'no-cache',
        'dnt' : 1,
        'pragma':'no-cache',
        'referer':'http://mp.toutiao.com/login/?redirect_url=%2F',
        'upgrade-insecure-requests':1
    }
}

var ret;

casper.start();

casper.open( login, header )
casper.then( function () {
    'use strict';
    //console.log('填写表单')
    send( '填写表单' );
    this.fill( 'form', auth, true );
    console.log('填写完成，开始登录')
    //send( '填写完成，开始登录' );
} )
casper.then( function () {
    'use strict';
    var self = this;
    console.log('等待登录结果......')
    //send( '等待登录结果......' );
})
casper.run()