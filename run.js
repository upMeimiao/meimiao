/**
 * ux crawler entrance 
 */
////log setting////////////////////////////////////////////////////////////////////
var logging = require('./lib/logging.js'); 
////arguments parse///////////////////////////////////////////////////////////////
var userArgv = require('optimist')
.usage('Usage: $0 -i [instance name] -a [crawl|test|config|proxy|schedule]  -p [num] -l[url] -h')
.options('i', {
        'alias' : 'instance',
        'default' : 'pengtouba',
        'describe' : 'Specify a instance',
        'demand' : true
    })
.options('a', {
        'alias' : 'action',
        'default' : 'crawl',
        'describe' : 'Specify a action[crawl|test|config|proxy|schedule]',
        'demand' : true
    })
.options('p', {
        'alias' : 'port',
        'default' : 2013,
        'describe' : 'Specify a service port, for config service and proxy router'
    })
.options('h', {
        'alias' : 'help',
        'describe' : 'Help infomation'
    });

var options = userArgv.argv;
if(options['h']){userArgv.showHelp();process.exit();}
var settings = require('./instance/'+options['i']+'/'+'settings.json');
settings['instance'] = options['i'];
////log level/////////////////////////////////////////////////////////////////
var log_level = 'DEBUG';
if(settings['log_level'])log_level = settings['log_level'];
////crawling action///////////////////////////////////////////////////////////
var crawling = function(){
	var logger = logging.getLogger('crawling',options['i'],log_level);
    settings['logger'] = logger;
    settings['instance'] = options['i'];
    var spider = new (require('./spider'))(settings);

    spider.start();
}
var meipai = function(){
    var logger = logging.getLogger('meipai',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    var mpSpider = new (require('./meipai'))(settings);
    mpSpider.start();
}
var youku = function () {
    var logger = logging.getLogger('youku',options['i'],log_level);
    settings['logger'] = logger;
    settings['instance'] = options['i'];
    var spider = new (require('./youku'))(settings);
    spider.start();
}
var miaopai = function () {
    var logger = logging.getLogger('miaopai',options['i'],log_level);
    settings['logger'] = logger;
    settings['instance'] = options['i'];
    var spider = new (require('./miaopai'))(settings);
    spider.start()
}
var bili = function () {
    var logger = logging.getLogger('bilibili',options['i'],log_level);
    settings['logger'] = logger;
    settings['instance'] = options['i'];
    var spider = new (require('./bili'))(settings);
    spider.start()
}
var tx = function () {
    var logger = logging.getLogger('腾讯视频',options['i'],log_level);
    settings['logger'] = logger;
    settings['instance'] = options['i'];
    var spider = new (require('./tx'))(settings);
    spider.start()
}
var creatTT = function () {
    var logger = logging.getLogger('creatTT',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    var creat_tt = new (require('./CreatTT'))(settings);
    creat_tt.start();
}
var ttmpSpider = function () {
    var logger = logging.getLogger('creatTT',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    var toutiao = new (require('./toutiaoHome'))(settings);
    toutiao.start();
}
var ttSpider = function () {
    var logger = logging.getLogger('toutiao',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    var toutiao = new (require('./toutiao'))(settings);
    toutiao.start()
}

////proxy Service////////////////////////////////////////////////////////////
var proxyService = function(){
	var logger = logging.getLogger('proxy-service',options['i'],log_level);
	settings['logger'] = logger;
	settings['port'] = parseInt(options['p']);
	var proxyRouter = new (require('./proxyrouter'))(settings);
	
	proxyRouter.start();
}
////config service////////////////////////////////////////////////////////////
var configService = function(){
	var logger = logging.getLogger('config-service',options['i'],log_level);
	settings['logger'] = logger;
	settings['port'] = parseInt(options['p']);
	var webConfig = new(require('./webconfig'))(settings);
	
	webConfig.start();	
}

////route/////////////////////////////////////////////////////////////////////
switch(options['a']){
    case 'crawl':
        crawling();
        break;
    case 'proxy':
        proxyService();
        break;
    case 'config':
        configService();
        break;
    case 'meipai':
        meipai()
        break
    case 'youku':
        youku()
        break
    case 'miaopai':
        miaopai()
        break
    case 'bili':
        bili()
        break
    case 'tx':
        tx()
        break
    case 'creatTT':
        creatTT()
        break
    case 'ttmp':
        ttmpSpider()
        break
    case 'tt':
        ttSpider()
        break
    default:
        userArgv.showHelp();
}