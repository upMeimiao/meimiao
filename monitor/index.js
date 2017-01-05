const app = require('./app')
const http = require('http')
const heartbeat = require('./controllers/heartbeat')
const monitorServer = require('./controllers/monitorServer')
const maintainServer = require('./controllers/maintainServer')

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
        const io = require('socket.io')(server)
        io.on('connection', function (socket) {
            heartbeat.do(io, socket)
        })
        monitorServer.start()
        maintainServer.start()
        logger.debug('Monitor started on port 3001')
    }}


module.exports = monitor