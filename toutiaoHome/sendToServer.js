
var request = require( 'request' );
var http = require('http');
var logger;
var settings;

var sendToServer = function ( spiderCore ) {
    'use strict';
    this.spiderCore = spiderCore;
    settings = spiderCore.settings;
    logger = settings.logger;
    logger.debug( '连接服务器模块 实例化...' );
};

/**
 * 向服务器发送任务结果
 * 任务结果是通过json.stringify改变一下
 * 收到回复，认为发送成功，返回服务器返回的内容
 * @param data
 * @param callback
 */
// sendToServer.prototype.send = function ( data, type, callback ) {
//     'use strict';
//     var self = this;
//     var back = {};
//     var route;
//     if ( type == 'nuomiCinema' ) {
//         route = 0;
//     }else {
//         logger.error('出现没有见过的任务类型：',type);
//         logger.debug(data);
//         route = 0;
//     }
//     var options = {
//         host: '127.0.0.1',
//         port: 80,
//         path: '/index.php/Admin/Cinemas/addCinema',
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json; charset=UTF-8'
//         }
//     };
//     //options.url = settings.sendToServer[ route ];
//     //logger.info(data)
//     var req = http.request(options, function(res) {
//         res.setEncoding('utf8');
//         res.on('data', function (body) {
//             body=JSON.parse(body).errno
//             //logger.info('CIty server return back : ' , body)
//             return callback( null, body );
//         });
//     });
//     req.write(data);
//     req.end();
// };


sendToServer.prototype.send = function ( data, type, callback ) {
   'use strict';
   var self = this;
   var options = {
       method : 'POST',
       form : data
   };
   var back = {};
   var route;
   if (type === 'ttmp') {
       route = 0;
   }else {
       logger.error('出现没有见过的任务类型：',type);
       logger.debug(data);
       route = 0;
   }
   options.url = settings.sendToServer[ route ];
   //logger.info(options)
   request.post( options, function ( err, res, body ) {
       if ( err ) {
           logger.error( 'occur error : ', err );
       }
       back = {
           statusCode : res.statusCode,
           headers : JSON.stringify( res.headers ),
           body : body
       };

       return callback( err, back );
   } );
};

module.exports = sendToServer;
