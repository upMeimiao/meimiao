const EventEmitter = require( 'events' ).EventEmitter
const argv = require( 'minimist' )( process.argv.slice( 2 ) )
const fs = require( 'fs' )
const path = require( 'path' )

const logger = require( './lib/logger.js' )

const event = new EventEmitter()

let i = argv.i
let t = argv.t

if ( !i ) {
    i = 'scheduler'
}
let way = path.join( '.' , '/instance' , i , 'settings.json' )

// TODO: Judge instance exist
fs.exists( way , ( result ) => {
    if ( result ) {
        event.emit( 'exist' )
    } else {
        event.emit( 'non' )
    }
} )

event.on( 'exist' ,  () => {
    let settings = require( './' + way )
    settings.logger = logger.getLogger( i , i , 'trace' )
    let scheduler = () => {
        let scheduler = new (require( './scheduler' ))( settings )
        if ( t ) {
            scheduler.test()
        } else {
            scheduler.start()
        }
    }
    let servant = () => {
        let crawling = new (require( './spider' ))( settings )
        crawling.start()
    }
    switch (i){
        case 'scheduler':
        case 'test':
            scheduler()
            break
        case 'servant':
            servant()
            break
        default:
            break
    }
} )

event.on( 'non' , () => {
    console.error( 'Specify instance name config is not exist' , { path : way } )
} )
