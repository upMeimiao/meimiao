/**
 * Created by james on 13-11-22.
 * extract middleware
 */
/**
 * extract link
 * @param crawl_info
 */
var cheerio = require( 'cheerio' )
var util = require( 'util' );
var url = require( "url" );
var querystring = require( 'querystring' );
require( '../lib/jsextend.js' );

var logger;

var extractor = function ( spiderCore ) {
    'use strict';
    this.spiderCore = spiderCore;
    logger = spiderCore.settings.logger;
    this.cumulative_failure = 0;

    logger.debug('提取器 实例化...');
};

////report to spidercore standby////////////////////////
extractor.prototype.assembly = function ( callback ) {
    'use strict';
    callback( null, true );
};

/**
 * According rules extracting all links from html string
 * @param content
 * @param rules
 * @returns {Array}
 */
extractor.prototype.extract_link = function ( $, rules ) {//rules 是一个数组
    'use strict';
    var links = [];
    for ( var i = 0 ; i < rules.length ; i++ ) {
        $( rules[ i ] ).each( function ( i, elem ) {//找tag
            if ( elem.name === 'img' ) {
                links.push( $( this ).attr( 'src' ) );
            }//如果是照片就返回照片的地址
            else {
                links.push( $( this ).attr( 'href' ) );
            }//如果是链接 就返回链接的地址
        } );
    }
    return links;//最后返回所有的结果
};
/**
 * get top level domain
 * www.baidu.com -> baidu.com
 * @param domain
 * @returns string
 * @private
 */
extractor.prototype.__getTopLevelDomain = function ( domain ) {
    'use strict';
    var arr = domain.split( '.' );
    if ( arr.length <= 2 ) {
        return domain;
    } else {
        return arr.slice( -2 ).join( '.' );
    }//应对buy.m.tmall.com
};

/**
 * url resolv
 * @param pageurl
 * @param links
 * @returns {Array}
 */
extractor.prototype.wash_link = function ( pageurl, links ) {
    //url resolve
    'use strict';
    var cleaned_link = [];
    for ( var i = 0 ; i < links.length ; i++ ) {
        if ( !links[ i ] ) {
            continue;
        }
        var link = links[ i ].trim();
        if ( !(link.startsWith( '#' ) || link.startsWith( 'javascript' ) || link.startsWith( 'void(' )) ) {
            try {
                var the_url = url.resolve( pageurl, link );
                if ( the_url !== pageurl ) {
                    cleaned_link.push( the_url );
                }
            } catch (e) {
                logger.error( 'Url resolve error: ' + pageurl + ', ' + link );
            }
        }
    }
    return arrayUnique( cleaned_link );
};
/**
 * detect link which drill rule matched
 * @param link
 * @returns [alias name,alias]
 */
extractor.prototype.detectLink = function ( link ) {
    'use strict';
    var urlObj = url.parse( link );
    var result = [];
    var domain = this.__getTopLevelDomain( urlObj.hostname );
    if ( this.spiderCore.spider.driller_rules[ domain ] !== undefined ) {
        var alias = this.spiderCore.spider.driller_rules[ domain ];
        for ( var a in alias ) {
            if ( alias.hasOwnProperty( a ) ) {
                var url_pattern = decodeURIComponent( alias[ a ][ 'url_pattern' ] );
                var pattern = new RegExp( url_pattern );
                if ( pattern.test( link ) ) {
                    result = [ 'driller:' + domain + ':' + a, alias[ a ] ];
                    break;
                }
            }
        }
    }
    return result;
};

/**
 * arrange link array.
 * @param links
 * @returns {{}}
 */
extractor.prototype.arrange_link = function ( links ) {
    'use strict';
    var linkObj = {};
    for ( var i = 0 ; i < links.length ; i++ ) {
        var link = links[ i ];
        var matched_driller = this.detectLink( link );
        if ( matched_driller.length > 0 ) {
            var driller_lib = 'urllib:' + matched_driller[ 0 ];
            var driller_rule = matched_driller[ 1 ];
            if ( typeof(driller_rule) != 'object' )driller_rule = JSON.parse( driller_rule );
            if ( linkObj[ driller_lib ] == undefined )linkObj[ driller_lib ] = [];
            if ( driller_rule[ 'id_parameter' ] && driller_rule[ 'id_parameter' ].length > 0 ) {
                var id_parameter = driller_rule[ 'id_parameter' ];
                var urlobj = url.parse( link );
                var parameters = querystring.parse( urlobj.query );
                var new_parameters = {};
                for ( var x = 0 ; x < id_parameter.length ; x++ ) {
                    var param_name = id_parameter[ x ];
                    if ( x == 0 && param_name == '#' )break;
                    if ( parameters.hasOwnProperty( param_name ) )new_parameters[ param_name ] = parameters[ param_name ];
                }
                urlobj.search = querystring.stringify( new_parameters );
                link = url.format( urlobj );
            }
            linkObj[ driller_lib ].push( link );
        }
    }
    for ( var i in linkObj ) {
        if ( linkObj.hasOwnProperty( i ) ) {
            linkObj[ i ] = arrayUnique( linkObj[ i ] );
        }
    }
    return linkObj;
}


/**
 * generate drill relation string: page->sub page->sub page
 * @param crawl_info
 * @returns string
 */
extractor.prototype.getDrillRelation = function ( $, crawl_info ) {
    //var rule = crawl_info['origin']['drill_relation_rule'];//rule: {"base":"content","mode":"css","expression":"#breadCrumb","pick":"innerText","index":1}
    var rule = this.spiderCore.spider.getDrillerRule( crawl_info[ 'origin' ][ 'urllib' ], 'drill_relation' );
    var origin_relation = crawl_info[ 'origin' ][ 'drill_relation' ];
    if ( !origin_relation )origin_relation = '*';
    var new_relation = '*';
    if ( rule ) {
        switch ( rule[ 'mode' ] ) {
            case 'regex':
                if ( rule[ 'base' ] === 'url' ) {
                    new_relation = this.regexSelector( crawl_info[ 'url' ], rule[ 'expression' ], rule[ 'index' ] );
                } else {
                    new_relation = this.regexSelector( crawl_info[ 'content' ], rule[ 'expression' ], rule[ 'index' ] );
                }
                break;
            case 'css':
            default:
                new_relation = this.cssSelector( $.root(), rule[ 'expression' ], rule[ 'pick' ], rule[ 'index' ] );
                break;
        }
    }
    return util.format( '%s->%s', origin_relation, new_relation );
}

/**
 * extractor: for now , just extract links
 * @param taskInfo
 * @returns {*}
 */
extractor.prototype.extract = function ( taskInfo ) {

    if(!taskInfo.origin){
        logger.error("taskInfo error : " , taskInfo);
        taskInfo.origin = {};
        return taskInfo
    }

    if ( taskInfo[ 'origin' ][ 'format' ] == 'binary' )return taskInfo;//如果是二进制 直接返回
    var extract_rule = this.spiderCore.spider.getDrillerRule( taskInfo[ 'origin' ][ 'urllib' ], 'extract_rule' );//获取抓取规则
    if ( taskInfo[ 'origin' ][ 'drill_rules' ] || extract_rule[ 'rule' ] ) {//如果抓取规则 或者 深入规则（） 存在
        var $ = cheerio.load( taskInfo[ 'content' ] );//载入内容
    }

    if ( taskInfo[ 'origin' ][ 'drill_rules' ] ) {//如果drill规则存在
        if ( taskInfo[ 'drill_link' ] ) {
            var drill_link = taskInfo[ 'drill_link' ];
        } else {
            var drill_link = this.extract_link( $, taskInfo[ 'origin' ][ 'drill_rules' ] );//返回所有的结果 注意 这里已经是结果了
        }

        var washed_link = this.wash_link( taskInfo[ 'url' ], drill_link );//既然已经有结果了 这里的作用应该是清洗链接把
        taskInfo[ 'drill_link' ] = this.arrange_link( washed_link );
        if ( this.spiderCore.settings[ 'keep_link_relation' ] )taskInfo[ 'drill_relation' ] = this.getDrillRelation( $,
            taskInfo );
    }

    if ( extract_rule[ 'rule' ] && !isEmpty( extract_rule[ 'rule' ] ) ) {//如果抓取规则存在且不为空
        var extracted_data = this.extract_data( taskInfo[ 'url' ],
            taskInfo[ 'content' ],
            extract_rule,
            null,
            $.root() );
        taskInfo.extracted_data = {};
        taskInfo[ 'extracted_data' ] = extracted_data;//是附加结果
    }
    return taskInfo;
}
/**
 * extract data
 * @param url
 * @param content
 * @param extract_rule
 * @param uppper_data
 * @param dom
 * @returns {{}}
 */
extractor.prototype.extract_data = function ( url, content, extract_rule, uppper_data, dom ) {
    var data = {};
    var self = this;
    if ( extract_rule[ 'category' ] )data[ 'category' ] = extract_rule[ 'category' ];
    //    if(extract_rule['require'])data['$require'] = extract_rule['require'];
    if ( extract_rule[ 'relate' ] )data[ 'relate' ] = uppper_data[ extract_rule[ 'relate' ] ];
    for ( i in extract_rule[ 'rule' ] ) {
        if ( extract_rule[ 'rule' ].hasOwnProperty( i ) ) {
            var rule = extract_rule[ 'rule' ][ i ];
            var baser = content;
            if ( rule[ 'base' ] === 'url' )baser = url;
            switch ( rule[ 'mode' ] ) {
                case 'regex':
                    var tmp_result = this.regexSelector( baser, rule[ 'expression' ], rule[ 'index' ] );
                    data[ i ] = tmp_result;
                    break;
                case 'xpath':
                    break;
                case 'value':
                    data[ i ] = rule[ 'expression' ];
                    break;
                case 'json':
                    break;
                default://css selector
                    if ( dom )baser = dom; else baser = (cheerio.load( content )).root();
                    var pick = rule[ 'pick' ];
                    if ( rule[ 'subset' ] ) {//?
                        pick = false;
                        (function ( k ) {
                            var result_arr = [];
                            var tmp_result = self.cssSelector( baser, rule[ 'expression' ], pick, rule[ 'index' ] );
                            if ( tmp_result ) {
                                tmp_result.each( function ( x, elem ) {
                                    var sub_dom = tmp_result.eq( x );
                                    result_arr.push( self.extract_data( url,
                                        content,
                                        rule[ 'subset' ],
                                        data,
                                        sub_dom ) );
                                } );
                            }
                            if ( !isEmpty( result_arr ) )data[ k ] = result_arr;
                        })( i );
                    } else {
                        try {
                            var tmp_result = this.cssSelector( baser, rule[ 'expression' ], pick, rule[ 'index' ] );
                            if ( tmp_result && !isEmpty( tmp_result ) )data[ i ] = tmp_result;
                        } catch (e) {
                            logger.error( url + ' extract field ' + i + ' error:' + e );
                        }
                    }

            }
        }
    }
    return data;
};
//check sublack
extractor.prototype.checksublack = function ( keys, data ) {
    var sublackarr = [];
    for ( var x = 0 ; x < keys.length ; x++ ) {
        if ( !data[ keys[ x ] ] ) {
            sublackarr.push( keys[ x ] );
            logger.warn( keys[ x ] + ' not found in ' + url + ' extracted data' );
        }
    }
    if ( sublackarr.length === keys.length )return sublackarr; else return [];
}

/**
 * extract value base expression
 * @param $
 * @param expression
 * @param pick
 * @param index
 * @returns {*}
 */
extractor.prototype.cssSelector = function ( $, expression, pick, index ) {
    //logger.debug( 'css expression: ' + expression );
    if ( !index )index = 1;
    var real_index = parseInt( index ) - 1;
    //if(real_index<0)real_index=0;
    var tmp_val = $.find( expression );
    if ( !pick )return tmp_val;
    if ( typeof(tmp_val) === 'object' ) {
        if ( real_index >= 0 ) {
            var val = tmp_val.eq( real_index );
            return this.cssSelectorPicker( val, pick );
        } else {
            var arrayResult = [];
            for ( var i = 0 ; i < tmp_val.length ; i++ ) {
                var val = tmp_val.eq( i );
                arrayResult.push( this.cssSelectorPicker( val, pick ) );
            }
            if ( arrayResult.length == 1 )arrayResult = arrayResult[ 0 ];
            return arrayResult;
        }
    } else {
        var val = tmp_val;
        return this.cssSelectorPicker( val, pick );
    }
}
/**
 * pick value/attribute from element
 * @param val
 * @param pick
 * @returns {*}
 */
extractor.prototype.cssSelectorPicker = function ( val, pick ) {
    var result;
    if ( pick.startsWith( '@' ) ) {
        result = val.attr( pick.slice( 1 ) );
    } else {
        switch ( pick.toLowerCase() ) {
            case 'text':
            case 'innertext':
                result = val.text();
                break;
            case 'html':
            case 'innerhtml':
                result = val.html();
                break;
        }
    }
    //if(result)result = result.replace(/[\r\n\t]/g, "").trim();
    if ( result )result = result.trim();
    return result;
}

/**
 * return matched group base expression
 * @param content
 * @param expression
 * @param index
 * @returns {*}
 */
extractor.prototype.regexSelector = function ( content, expression, index ) {
    var index = parseInt( index );
    if ( index == 0 )index = 1;
    var expression = new RegExp( expression, "ig" );
    if ( index > 0 ) {
        var matched = expression.exec( content );
        if ( matched && matched.length > index )return matched[ index ];
    } else {
        var arr = [], matched;
        while ( matched = expression.exec( content ) )
            arr.push( matched[ 1 ] );
        return arr;
    }

}

/**
 * 验证抓取的结果是否正确
 * @param taskInfo
 * @returns {boolean}
 */
extractor.prototype.validateContent = function ( taskInfo ) {
    var self = this;
    var result = true;

    var statusCode = taskInfo.statusCode;

    var limitation = 20;//限制什么？限制的是结果的长度，这个限制也应该存在于设置里面。这个限制是对于返回字节长度
    if ( taskInfo[ 'origin' ][ 'format' ] == 'binary' )limitation = 20;//如果返回的是二进制文件，有个疑问了，二进制文件？？？是什么情况
    if ( statusCode === 200 || statusCode === 'success' ) {//状态码为200
        if ( taskInfo[ 'content' ].length < limitation ) {//就要开始验证收到的内容长度，如果结果长度太短
            logger.error( util.format( 'Too little content: %s, length:%s, data_id:%s',
                taskInfo[ 'url' ],
                taskInfo[ 'content' ].length,
                taskInfo.origin.taskId ) );
            result = false;
        }

        //到底需不需要再做一次验证..
        if ( taskInfo[ 'origin' ][ 'validation_keywords' ] ) {//检查页面是否包含 配置文件里面设置的关键词 以此来判断页面是否达到要求
            for ( var i = 0 ; i < taskInfo[ 'origin' ][ 'validation_keywords' ].length ; i++ ) {
                var keyword = taskInfo[ 'origin' ][ 'validation_keywords' ][ i ];
                if ( taskInfo[ 'content' ].indexOf( keyword ) < 0 ) {//如果没有找到
                    logger.error( util.format( '%s lacked keyword: %s', taskInfo[ 'url' ], keyword ) );
                    result = false;//
                    break;//跳出
                }
            }
        }
    } else {//如果状态码不是200 网络传输有问题
        logger.error( util.format( 'url:%s, status code: %s', taskInfo[ 'url' ], statusCode ) );
        if ( statusCode > 300 )result = false;//30x,40x,50x
    }
    if ( self.spiderCore.settings[ 'to_much_fail_exit' ] ) {//如果失败次数超过 配置文件里面设置的次数 程序退出
        self.cumulative_failure += result ? -1 : 1
        if ( self.cumulative_failure < 0 )self.cumulative_failure = 0;
        if ( self.cumulative_failure > self.spiderCore.settings[ 'spider_concurrency' ] * 1.5 ) {
            logger.fatal( 'too much fail, exit. ' + self.cumulative_failure );
            process.exit( 1 );
        }
    }
    return result;//如果没有退出的话，返回结果
};

module.exports = extractor;
