var URL = require("url")
var logger;
var controller = function ( spiderCore ) {
    'use strict';
    this.spiderCore = spiderCore;
    logger = spiderCore.settings.logger;
    logger.debug( "任务控制器 实例化..." );
};
controller.prototype.classify = function ( taskInfo ) {
    'use strict';
    var self = this;
    var type = taskInfo.origin.taskType;
    //拿到任务类型
    logger.debug( "开始判断任务类型" );
    switch ( String( type ) ) {
        case 'iqiyi_fans':
            logger.debug( "任务类型：爱奇艺粉丝任务" );
            return self.fans( taskInfo );
        default :
            taskInfo.origin.done = null;
            return taskInfo;
    }
};
controller.prototype.fans = function (taskInfo) {
    var app = taskInfo.origin.app,
        res = taskInfo.extracted_data
    if(typeof res.fans === 'undefined')return taskInfo
    var start = res.fans.indexOf("(") + 1,
        end = res.fans.lastIndexOf(")"),
        fans_num = res.fans.substring(start,end)
    var backInfo = {
        name: "爱奇艺",
        uid: "1267152904",
        u_name: "一色神技能",
        fans_num: fans_num
    }
    taskInfo.origin.done = true;
    taskInfo.backInfo = backInfo
    logger.info(backInfo)
    return taskInfo
}
module.exports = controller;