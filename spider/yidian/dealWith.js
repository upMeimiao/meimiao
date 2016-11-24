/**
 * Created by yunsong on 16/7/29.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
const cheerio = require( 'cheerio' )

let logger
class dealWith {
    constructor (spiderCore){
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo (task,callback) {
        this.getUser(task,task.id,(err)=>{
            if(err){
                return callback(err)
            }
            callback()
        })
    }
    getUser (task,id,callback){
        let option = {
            url: this.settings.userInfo + id,
            referer: 'http://www.yidianzixun.com/home?page=channel&id=' + id
        }
        request.get(option,(err,result) => {
            if(err){
                return callback(err)
            }
            let $ = cheerio.load(result.body),
                num = $('span.subnum').text(),
                fans_num = parseInt(num),
                user = {
                    platform: 11,
                    bid: task.id,
                    fans_num: fans_num
                }
            this.sendUser ( user,(err,result) => {
                callback()
            })
            this.sendStagingUser(user)
        })
    }
    sendUser (user,callback){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(option,(err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回一点资讯用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`一点资讯用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return callback(e)
            }
            if(back.errno == 0){
                logger.debug("一点资讯用户:",user.bid + ' back_end')
            }else{
                logger.error("一点资讯用户:",user.bid + ' back_error')
                logger.info(back)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.caihongip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',result)
                return
            }
            if(result.errno == 0){
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.info(result)
            }
        })
    }
}
module.exports = dealWith