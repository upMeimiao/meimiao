const DealWith = require( './dealWith' )

let dealWith,logger

class Handle {
    constructor ( core ){
        dealWith =  new DealWith( core )
        logger = core.settings.logger
        logger.debug('控制器实例化...')
    }
    youkuHandle ( crx, remote ) {
        dealWith.youku( remote, ( err, result ) => {
            if( err ){

                return
            }
            crx.res.setHeader('Content-Type',`text/plain;charset=utf-8`)
            crx.res.writeHead(200)
            crx.res.end(JSON.stringify({name:'junhao',age:24}))
        })
    }
}
module.exports = Handle