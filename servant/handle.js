const DealWith = require( './dealWith' )

let dealWith,logger

class Handle {
    constructor ( core ){
        dealWith =  new DealWith( core )
        logger = core.settings.logger
        logger.debug('控制器实例化...')
    }
    youkuHandle ( ctx, remote ) {
        dealWith.youku( remote, ( err, result ) => {
            if( err ){

                return
            }
            ctx.res.setHeader('Content-Type',`text/plain;charset=utf-8`)
            ctx.res.writeHead(200)
            ctx.res.end(JSON.stringify({name:'junhao',age:24}))
        })
    }
    iqiyiHandle ( ctx, remote ) {

    }
}
module.exports = Handle