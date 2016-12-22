const app = require('./app')
const debug = require('debug')('express:server')
const http = require('http')

let logger
class monitor {
    constructor ( settings ){
        this.port = settings.listen.port
        this.ip = settings.listen.ip
        logger = settings.logger
    }
    start() {
        app.set('port', this.port)
        const server = http.createServer(app)
        server.listen(this.port)
        server.on('error', onError)
        server.on('listening', onListening)
        function onError(error) {
            if (error.syscall !== 'listen') {
                throw error
            }
            const bind = typeof this.port === 'string'
                ? 'Pipe ' + this.port
                : 'Port ' + this.port
            // handle specific listen errors with friendly messages
            switch (error.code) {
                case 'EACCES':
                    console.error(bind + ' requires elevated privileges')
                    process.exit(1)
                    break
                case 'EADDRINUSE':
                    console.error(bind + ' is already in use')
                    process.exit(1)
                    break
                default:
                    throw error
            }
        }
        function onListening() {
            const addr = server.address()
            const bind = typeof addr === 'string'
                ? 'pipe ' + addr
                : 'port ' + addr.port
            debug('Listening on ' + bind)
        }
        logger.debug('Monitor started on port 3001')
    }}


module.exports = monitor