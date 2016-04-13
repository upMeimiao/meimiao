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
        case 'ttmp':
            logger.debug( "任务类型：糯米网城市信息任务" );
            return self.ttmp( taskInfo );
        default :
            taskInfo.origin.done = null;
            return taskInfo;
    }
};
controller.prototype.ttmp = function (taskInfo) {
    var app = taskInfo.origin.app,
        res = taskInfo.extracted_data
    if(typeof res.num === 'undefined')return taskInfo
    var fans_num = res.num[0].replace(",",""),
        recommend_num = res.num[1].replace(",",""),
        toutiao_num = res.num[2].replace(",",""),
        read_num = res.num[3]
    var backInfo = {
        name: "今日头条",
        uid: "m3542667621",
        u_name: "创意生活每一天",
        fans_num: fans_num,
        recommend_num: recommend_num,
        toutiao_num: toutiao_num,
        read_num: read_num
    }
    taskInfo.origin.done = true;
    taskInfo.backInfo = backInfo
    logger.info(backInfo)
    return taskInfo
}
module.exports = controller;