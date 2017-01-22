/**
 * Created by ifable on 2017/1/16.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( 'request' )

let logger
class getProgram {
    constructor(spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    start(task, callback) {
        /**
         * 获取专辑信息
         * 通过专辑获取视频ID
         * */
        this.getAlbum(task, (err, result) => {
            if(err){
                return callback(err)
            }
            callback()
        })
    }
    getAlbum(task, callback) {
        let sign = true,
            options = {
                method: 'GET',
                qs: { caller: '1', pg: sign, pl: '50', uid: task.encodeId },
                timeout: 5000
            }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                options = {

                }
                request(options, (error, response, body) => {
                    if(error){
                        logger.error( 'occur error : ', error )
                        return cb()
                    }
                    if(response.statusCode != 200){
                        logger.error(`list error code: ${response.statusCode}`)
                        return cb()
                    }
                    try{
                        body = JSON.parse(body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info('list error:',body)
                        return cb()
                    }
                    let data = body.data
                    if(!data){
                        // logger.error('body data : ',sign)
                        // logger.error(body)
                        sign++
                        return cb()
                    }
                    let videos = data.videos
                    this.info(task,videos, () => {
                        sign++
                        cb()
                    })
                })
            },
            (err,result) => {
                callback()
            }
        )
        request(this.settings.program)
    }
}
module.exports = getProgram