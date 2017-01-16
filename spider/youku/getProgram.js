/**
 * Created by ifable on 2017/1/16.
 */
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
    }
}
module.exports = getProgram