/**
 * Created by junhao on 16/4/14.
 */
var logger
var moment = require('moment')
var async = require( 'async' )
var jsonp = function (data) {
    return data
}
var spiderCore = function(settings){
    this.settings = settings
    this.api_request = new (require( './api_request.js' ))( this )
    logger = settings.logger
    this.videosList = []
}
spiderCore.prototype.start = function () {
    logger.debug("start")
    var spiderCore = this
    this.getTotal(function () {
        spiderCore.sendVideos(function () {
            spiderCore.wait()
        })
    })
}
module.exports = spiderCore