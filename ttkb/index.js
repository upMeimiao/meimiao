/**
 * Created by ifable on 16/6/7.
 */
var async = require( 'async' )
var logger
var jsonp = function (data) {
    return data
}
var spiderCore = function (settings) {
    this.settings = settings
    logger = settings.logger
    this.api_request = new (require( './api_request.js' ))( this )
}
spiderCore.prototype.start = function () {
    logger.debug('start')
}
module.exports = spiderCore