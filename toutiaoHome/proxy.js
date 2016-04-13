/**
 * Created by shangnan on 15-3-19.
 */
var axon = require( 'axon' );
var msgpack = require( 'msgpack5' )();

var logger;
var settings;

var proxy = function ( spiderCore ) {
    'use strict';

    this.spiderCore = spiderCore;
    settings = spiderCore.settings;
    logger = settings.logger;

    this.host = settings.proxy.host;
    this.port = settings.proxy.port;

    this.sock = axon.socket( 'req' );

    logger.info( 'Proxy module instantiation' );
};

/**
 * Ready Go!
 * @param callback
 */
proxy.prototype.ready = function ( callback ) {
    'use strict';

    var self = this;

    this.sock.connect( self.port , self.host );

    logger.debug( 'Start send test' );
    this.sock.send( 'test' , 'test' , function ( res ) {
        if ( res ) {
            logger.info( 'Proxy server return back :' , res );
            logger.debug( 'Connection is fine' );
            return callback( null , true );
        }
    } );
};

/**
 * Send a request for proxy
 * @param times
 * @param callback
 * @returns {*}
 */
proxy.prototype.need = function ( times , callback ) {
    'use strict';

    var self = this;

    if ( times > 3 ) {
        return callback( 'timeout!' );
    }

    logger.debug( 'Send a Require command' );
    this.sock.send( 'require' , msgpack.encode( 'require' ) , function ( res ) {
        if ( res ) {
            var proxy;
            try {
                proxy = msgpack.decode( res );
            } catch ( e ) {
                logger.error( 'Decode response occur error!' );
                return callback( e.message );
            }
            return callback( null , proxy );
        }

        setTimeout( function () {
            return self.need( times + 1 , callback );
        } , 10000 );
    } );
};

/**
 * Return back proxy
 * @param proxy
 * @param status
 * @param callback
 */
proxy.prototype.back = function ( proxy , status , callback ) {
    'use strict';

    var back = {
        proxy : proxy ,
        status : status
    };

    this.sock.send( 'back' , msgpack.encode( back ) , function ( res ) {
        if ( callback ) {
            return callback( res );
        }
    } );
};

module.exports = proxy;