var EventEmitter = require( 'events' ).EventEmitter;
var argv = require( 'minimist' )( process.argv.slice( 2 ) );
var fs = require( 'fs' );
var path = require( 'path' );

var logger = require( './lib/logger.js' );

var event = new EventEmitter();

var i = argv.i;
var t = argv.t;

if ( !i ) {
    i = 'generate';
}
var way = path.join( '.' , '/instance' , i , 'settings.json' );

// TODO: Judge instance exist
fs.exists( way , function ( result ) {
    if ( result ) {
        event.emit( 'exist' );
    } else {
        event.emit( 'non' );
    }
} );

event.on( 'exist' , function () {

    var settings = require( './' + way );

    settings.logger = logger.getLogger( i , i , 'trace' );

    var scheduler = new (require( './scheduler' ))( settings );

    if ( t ) {
        scheduler.test();
    } else {
        scheduler.start();
    }
} );

event.on( 'non' , function () {
    console.error( 'Specify instance name config is not exist' , { path : way } );
} );
