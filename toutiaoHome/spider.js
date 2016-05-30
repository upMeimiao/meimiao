/**
 * Created by james on 13-12-5.
 * spider middleware
 */

var crypto = require( 'crypto' );
var url = require( 'url' );
var util = require( 'util' );
var async = require( 'async' );
var myredis = require( './myredis.js' );

var logger;
var spiderCore;
var settings;

/**
 * 爬虫控制器的构造函数
 * @param  {object} spiderCore 配置集合（对象）
 */
var spider = function ( _spiderCore ) {
    'use strict';
    spiderCore = _spiderCore;
    this.queue_length = 0;
    this.driller_rules_updated = 0;
    this.driller_rules = {};
    logger = spiderCore.settings.logger;
    settings = spiderCore.settings;

    logger.debug('爬虫模块 实例化...');
};

////report to spiderCore standby////////////////////////
/**
 * 初始化redis连接
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
spider.prototype.assembly = function ( callback ) {
    'use strict';
    callback();
};
/**
 * smart parse string to json object deeply(level2)
 * 说明：将对象中的可以转化为对象或数组的字符串转化
 * @param obj 原始对象
 */
spider.prototype.jsonSmartDeepParse = function ( obj ) {
    'use strict';
    var dataobj = {};
    var numberPattern = new RegExp( '^\-?[0-9]+$' );
    for ( var i in obj ) {
        if ( obj.hasOwnProperty( i ) ) {
            if ( typeof(obj[ i ]) === 'string' && (obj[ i ].charAt( 0 ) === '{' || obj[ i ].charAt( 0 ) === '[') ) {
                dataobj[ i ] = JSON.parse( obj[ i ] );
            } else if ( numberPattern.test( obj[ i ] ) ) {
                dataobj[ i ] = parseInt( obj[ i ] );
            } else if ( obj[ i ] === 'true' ) {
                dataobj[ i ] = true;
            } else if ( obj[ i ] === 'false' ) {
                dataobj[ i ] = false;
            } else {
                dataobj[ i ] = obj[ i ];
            }
        }
    }
    return dataobj;
};

/**
 * 刷新抓取规则
 * 要开始修改的第一个地方，就是刷新规则
 * 好吧，似乎和规则无关暂时。
 * 等等，印象中好像要在配置信息里面加上一点东西
 */
spider.prototype.refreshDrillerRules = function () {
    'use strict';
    var self = this;
    var redis_cli = spiderCore.redis.drillerInfo;
    redis_cli.get( 'updated:driller:rule', function ( err, value ) {//拿到抓取规则最后更新时间
        if ( err ) {
            throw(err);
        }
        if ( self.driller_rules_updated !== parseInt( value ) ) {//driller is changed 还是使用时间作为判断  初始化也会进入这里
            logger.debug( 'driller rules is changed' );//如果时间不同，说明规则有变化，第一次启动也会认为规则变动，如果规则变动了，就要重新获取所有的规则
            redis_cli.hlist( 'driller:*', function ( err, values ) {//拿到所有的规则配置信息  在线配置的  数组形式
                if ( err ) {
                    throw(err);
                }
                self.tmp_driller_rules = {};//
                self.tmp_driller_rules_length = values.length;//获得配置信息的数量
                for ( var i = 0 ; i < values.length ; i++ ) {//循环做什么？
                    self.wrapper_rules( values[ i ] );//传进去单独的规则
                }
            } );

            //将更新标志标记为“未更新”
            self.driller_rules_updated = parseInt( value );//把时间更新
        } else {
            logger.debug( 'driller rules is not changed, queue length: ' + self.queue_length );
            //周期性检查规则是否改变
            setTimeout( function () {
                self.refreshDrillerRules();
            }, spiderCore.settings.check_driller_rules_interval * 1000 );
        }
    } );
};
/**
 * 根据id和name获得对应的爬取规则
 * @param id
 * @param name
 */
spider.prototype.getDrillerRule = function ( id, name ) {
    'use strict';
    var splited_id = id.split( ':' );
    var pos = 1;
    if ( splited_id[ 0 ] === 'urllib' ) {
        pos = 2;
    }
    if ( this.driller_rules[ splited_id[ pos ] ][ splited_id[ pos + 1 ] ] && this.driller_rules[ splited_id[ pos ] ][ splited_id[ pos + 1 ] ].hasOwnProperty( name ) ) {
        return this.driller_rules[ splited_id[ pos ] ][ splited_id[ pos + 1 ] ][ name ];
    } else {
        logger.warn( util.format( '%s in %s %s, not found', name, splited_id[ pos ], splited_id[ pos + 1 ] ) );
        return false;
    }
};

/**
 *对内存中的规则列表中的每个规则对象进行包装
 * @param  {string} key 规则的key
 */
spider.prototype.wrapper_rules = function ( key ) {
    'use strict';
    var self = this;
    var redis_cli = spiderCore.redis.drillerInfo;
    //key 是 名字
    //value 是 规则内容
    redis_cli.hgetall( key, function ( err, value ) {//for synchronized using object variable
        if ( self.tmp_driller_rules === undefined ) {
            self.tmp_driller_rules = {};
        }
        var isActive = value.active === 'true' || value.active === true || value.active === '1' || value.active === 1 ? true : false;
        if ( isActive ) {
            logger.debug( 'Load rule: ' + key );
            if ( self.tmp_driller_rules[ value.domain ] === undefined ) {
                self.tmp_driller_rules[ value.domain ] = {};
            }
            self.tmp_driller_rules[ value.domain ][ value.alias ] = self.jsonSmartDeepParse( value );//分割规则 规则在这里赋值给了临时变量，然后这个临时变量再把规则给全局变量
        } else {
            logger.debug( 'Ignore rule: ' + key + ', status inactive' );
        }
        self.tmp_driller_rules_length--;
        if ( self.tmp_driller_rules_length <= 0 ) {
            self.driller_rules = self.tmp_driller_rules;
            //self.driller_rules_updated = (new Date()).getTime();
            spiderCore.emit( 'driller_rules_loaded', self.driller_rules );

            //周期性检查规则是否改变
            setTimeout( function () {
                self.refreshDrillerRules();
            }, spiderCore.settings.check_driller_rules_interval * 1000 );
        }
    } );
};
/**
 * 获取任务信息，并开始下载
 * @param callback
 */
spider.prototype.getUrlQueue = function ( callback ) {
    'use strict';
    var self = this;
    spiderCore.task.getTask( function ( err, _taskInfo ) {
        if ( err ) {
            logger.error( '获取任务出现错误：', err );
            return callback( err );
        }
        // 如果返回空
        // 队列空了
        // 返回信号，约定10s之后再获取
        if ( _taskInfo === null ) {
            return callback( null );
        }
        // 任务存在，寻找任务对应的配置信息
        var taskInfo = self.wrapLink( _taskInfo );
        // 任务对应的配置信息存在
        if ( taskInfo !== null ) {
            spiderCore.emit( 'new_url_queue', taskInfo );
            return callback( true );
        }
        // 任务对应的配置信息不存在
        // 马上进入下一次查询
        return callback( false );
    } );
};
/**
 * Check how many urls can be append to queue
 * 队列一点一点往里面加任务
 * @param spider
 */
spider.prototype.checkQueue = function ( spider ) {
    'use strict';
    var breakTt = false;
    var self = this;
    async.whilst( function () {
        logger.debug( 'Check queue, length: ' + spider.queue_length );//逐渐增加到设置的最大值
        //返回true 会继续执行，false会结束循环
        return spider.queue_length < spiderCore.settings.spider_concurrency && breakTt !== true;
    }, function ( cb ) {
        spider.getUrlQueue( function ( bol ) {
            if ( bol === true ) {
                spider.queue_length++;
            } else if ( bol === false ) {
                return cb();
            } else {
                // 空
                setTimeout( function () {
                    self.checkQueue( spider );
                }, spiderCore.settings.getQueueTime );
                breakTt = true;
            }
            setTimeout( cb, 300 );
        } );
    }, function ( err ) {
        if ( err ) {
            logger.error( 'Exception in check queue.' );
        }
    } );
};

/**
 * TOP Domain,e.g: www.baidu.com  -> baidu.com
 * @param domain
 * @returns {*}
 * @private
 */
spider.prototype.__getTopLevelDomain = function ( domain ) {
    'use strict';
    var arr = domain.split( '.' );
    if ( arr.length <= 2 ) {
        return domain;
    } else {
        return arr.slice( -2 ).join( '.' );
    }//应对buy.m.tmall.com 的形式
};
/**
 * 在任务开始之前就先判断一下
 * 这个任务是否能到规则中匹配出结果
 *
 * 这样是为了防止规则之外的任务进入，同时可以在一定程度上保证任务信息的正确性（不能保证内容正确，只能保证设置正确）
 * detect link which driller rule matched
 * @param taskInfo
 * @returns {string}
 */
spider.prototype.detectLink = function ( taskInfo ) {
    //放弃使用url_pattern
    'use strict';
    //logger.debug( '查看task信息：\n', taskInfo );
    var urlObj = url.parse( taskInfo.taskUrl );
    var result = '';
    var alias = '';
    var domain = this.__getTopLevelDomain( urlObj.hostname );//获取顶级域名，再根据顶级域名来查找下面的 alias
    //logger.debug('查看域名信息：',domain);
    for ( var topDomain in this.driller_rules ) {
        Object.keys( this.driller_rules[ topDomain ] ).forEach( function ( val, index ) {
            if ( val === taskInfo.alias ) {
                domain = topDomain;
                alias = val;

            }
        } );
        if ( alias !== '' ) {
            break;//找到了跳出
        }
    }
    //logger.debug('确定有没有找到：\n',this.driller_rules[domain][alias]);
    if ( domain in Object( this.driller_rules ) ) {
        if ( alias in Object( this.driller_rules[ domain ] ) ) {
            result = 'driller:' + domain + ':' + taskInfo[ 'alias' ];
        }
    }
    return result;//返回结果
};

/**
 * construct a url info
 * 在开始做任务之前，要做两件事
 * 一件事是 判断有没有适用的规则
 * 一件事是包装任务
 *
 * 现在投入进来的是task，不光是url了
 *
 * 增加了referer 在配置文件里面也要相应增加
 * @param taskInfo
 * @returns {*}
 */
spider.prototype.wrapLink = function ( taskInfo ) {
    'use strict';
    var linkinfo = null,self = this;
    if(!taskInfo.taskUrl){
        logger.error("不存在任务url : " , taskInfo );
        return null
    }
    var driller = this.detectLink( taskInfo )
    if ( driller !== '' ) {//如果返回有结果
        var driller_arr = driller.split(':');//就把这个东西分割 driller | domain | alias
        var drillerInfo = this.driller_rules[driller_arr[1]][driller_arr[2]];//domain alias
        if(taskInfo.type == 'ttmp'){
            linkinfo = {
                "url":taskInfo.taskUrl,
                "version":(new Date()).getTime(),
                "type":drillerInfo['type'],
                "format":drillerInfo['format'],
                "encoding":drillerInfo['encoding'],
                "referer":"http://mp.toutiao.com/login/?redirect_url=%2F",
                "url_pattern":drillerInfo['url_pattern'],
                "urllib":'urllib:'+driller,
                "save_page":drillerInfo['save_page'],
                "cookie":spiderCore.cookie,
                'use_proxy' : drillerInfo['use_proxy'],
                "jshandle":drillerInfo['jshandle'],
                "inject_jquery":drillerInfo['inject_jquery'],
                "drill_rules":drillerInfo['drill_rules'],
                "drill_relation":'*',
                "validation_keywords":drillerInfo['validation_keywords']&&drillerInfo['validation_keywords']!='undefined'?drillerInfo['validation_keywords']:'',
                "script":drillerInfo['script'],
                "navigate_rule":drillerInfo['navigate_rule'],
                "stoppage":drillerInfo['stoppage'],
                'extract_rule' : drillerInfo.extract_rule,//已经引入抓取规则
                'loaded_signal' : drillerInfo.loaded_signal, //下面是任务选项
                'taskId': taskInfo.taskId,
                'app':taskInfo.app,
                'priority' : taskInfo.priority,
                'alias': taskInfo.alias,
                'taskType': taskInfo.type,
                'done': taskInfo.done
            }
            //logger.debug(linkinfo)
        }
    }
    return linkinfo;
}

spider.prototype.retryCrawl = function ( taskInfo ) {
    'use strict';
    //logger.debug( '查看taskInfo内容：', taskInfo );
    var spider = this;
    var retryLimit = 3;
    if ( spiderCore.settings.download_retry && spiderCore.settings.download_retry !== undefined ) {
        retryLimit = spiderCore.settings.download_retry;
    }

    var actRetry = taskInfo.retry || 0;

    if ( actRetry < retryLimit ) {
        taskInfo.retry = actRetry + 1;
        logger.info( util.format( 'Retry url: %s, time: ', taskInfo.url, taskInfo.retry ) );
        spiderCore.emit( 'new_url_queue', taskInfo );
    } else {
        logger.error( util.format( 'after %s reties, give up crawl %s', taskInfo.retry, taskInfo.url ) );
        // 调用完成，是为了判定为完成
        spiderCore.task.finish( taskInfo.taskId ,function(err){
            if(err){
                logger.error('重试任务删除出现错误');
                return ;
            }
            spiderCore.emit( 'slide_queue' );
            return ;
        });
    }
};

module.exports = spider;
