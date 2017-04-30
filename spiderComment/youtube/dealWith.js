/**
* Created by junhao on 2017/2/10.
*/
const async = require('async');
const Utils = require('../../lib/spiderUtils');
const cheerio = require('cheerio');
const req = require('request');

let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.cNum = 0;      // 评论的数量
    task.lastId = 0;      // 第一页评论的第一个评论Id
    task.lastTime = 0;      // 第一页评论的第一个评论时间
    task.isEnd = false;  // 判断当前评论跟库里返回的评论是否一致
    task.addCount = 0;      // 新增的评论数
    this.videoInfo(task, (err, result) => {
      if (result == 'add_0') {
        return callback(null);
      }
      callback(null, task.cNum, task.lastId, task.lastTime, task.addCount);
    });
  }
  videoInfo(task, callback) {
    let option = {
        url: `https://www.youtube.com/watch?v=${task.aid}&spf=navigate`,
        proxy: 'http://127.0.0.1:56777',
        method: 'GET',
        headers: {
          referer: `https://www.youtube.com/channel/${task.bid}`,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
          'accept-language': 'zh-CN,zh;q=0.8',
          cookie: 'PREF=f5=30&fms2=10000&fms1=10000&al=zh-CN&f1=50000000; VISITOR_INFO1_LIVE=G3t2ohxkCtA; YSC=24sBeukc1vk;'
        }
      },
      session_token,
      page_token,
      foot;
    req(option, (error, response, body) => {
      if (error) {
        logger.debug('youtube的视频参数接口请求失败', error);
        return this.videoInfo(task, callback);
      }
      if (response.statusCode != 200) {
        logger.debug('视频参数状态码错误', response.statusCode);
        return this.videoInfo(task, callback);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('解析失败', body);
        return this.videoInfo(task, callback);
      }
      body = body[3].foot.replace(/[\s\n\r]/g, '');
      session_token = body.match(/\'XSRF_TOKEN\':"\w*=+",/).toString().replace(/\'XSRF_TOKEN\':"/, '').replace('",', '');
      page_token = body.match(/'COMMENTS_TOKEN':"[\w%]*/).toString().replace(/'COMMENTS_TOKEN':"/, '').replace('",', '');
      this.getNewTime(task, session_token, page_token, (err) => {
        callback();
      });
    });
  }
  getNewTime(task, session_token, page_token, callback) {
    const option = {
      url: `https://www.youtube.com/watch_fragments_ajax?v=${task.aid}&tr=time&distiller=1&ctoken=${page_token}&frags=comments&spf=load`,
      method: 'POST',
      proxy: 'http://127.0.0.1:56777',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        referer: `https://www.youtube.com/watch?v=${task.aid}`,
        cookie: 'PREF=f5=30&fms2=10000&fms1=10000&al=zh-CN&f1=50000000; VISITOR_INFO1_LIVE=G3t2ohxkCtA; YSC=24sBeukc1vk;',
        accept: '*/*'
      },
      formData: {
        session_token
      }
    };
    req(option, (error, response, body) => {
      if (error) {
        logger.debug('youtube评论DOM接口请求失败', error);
        return this.getNewTime(task, session_token, page_token, callback);
      }
      if (response.statusCode != 200) {
            	logger.debug('评论状态码错误', response.statusCode);
        return this.getNewTime(task, session_token, page_token, callback);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('解析失败', body);
        return this.getNewTime(task, session_token, page_token, callback);
      }
      const $ = cheerio.load(body.body['watch-discussion']);
            /* if(task.commentNum == 0){
				task.commentcNum = task.cNum;
			}*/
      page_token = $('div.yt-uix-menu.comment-section-sort-menu>div.yt-uix-menu-content>ul>li').eq(1).find('button').attr('data-token').replace(/(253D)/g, '3D');
      this.commentList(task, session_token, page_token, (err) => {
            	callback();
      });
    });
  }
  commentList(task, session_token, page_token, callback) {
    let option = {},
      cycle = true,
      $ = null,
      _$ = null;
		// logger.debug('---');
    async.whilst(
			() => cycle,
			(cb) => {
  option = {
    url: 'https://www.youtube.com/comment_service_ajax?action_get_comments=1',
    method: 'POST',
    proxy: 'http://127.0.0.1:56777',
    headers: {
      referer: `https://www.youtube.com/watch?v=${task.aid}`,
      cookie: 'PREF=f5=30&fms2=10000&fms1=10000&al=zh-CN&f1=50000000; VISITOR_INFO1_LIVE=G3t2ohxkCtA; YSC=24sBeukc1vk;',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
      'accept-language': 'zh-CN,zh;q=0.8'
    },
    formData: {
      page_token,
      session_token
    }
  };
  req(option, (error, response, body) => {
    if (error) {
      logger.debug('youtube评论列表请求失败', err);
      return cb();
    }
    if (response.statusCode != 200) {
      logger.debug(option);
      logger.debug('评论列表状态码错误', response.statusCode);
      return cb();
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      logger.debug('评论列表数据解析失败', body);
      return cb();
    }
    logger.debug('+++');
    if (!body.content_html) {
      cycle = false;
      return cb();
    }
    $ = cheerio.load(body.content_html);
    if (body.load_more_widget_html) {
      _$ = cheerio.load(body.load_more_widget_html);
    } else {
      _$ = null;
    }
    if (!task.lastId) {
      task.lastId = $('.comment-thread-renderer').first().find('.comment-simplebox-edit').attr('id').split('-')[3];
    }
    if ($('.comment-thread-renderer').length <= 0) {
      cycle = false;
      return cb();
    }
    this.deal(task, $('.comment-thread-renderer'), (err) => {
      page_token = !_$ ? null : _$('button.yt-uix-button.comment-section-renderer-paginator').attr('data-uix-load-more-post-body').replace('page_token=', '').replace(/253D/g, '3D');
      if (!page_token) {
        cycle = false;
      }
      if (task.isEnd) {
        cycle = false;
      }
      cb();
    });
  });
},
			(err, result) => {
  if (task.addCount == 0) {
    task.addCount = task.cNum - task.commentNum;
  }
  callback();
}
		);
  }
  deal(task, comments, callback) {
    let length = comments.length,
      index = 0,
      commentData,
      reply,
      cid,
      comment;
    task.cNum += length;
		// logger.debug(length);
    async.whilst(
			() => index < length,
			(cb) => {
  commentData = comments.eq(index);
  cid = commentData.find('.comment-simplebox-edit').attr('id').split('-')[3];
  reply = commentData.find('.comment-replies-renderer .load-more-text').text() ? commentData.find('.comment-replies-renderer .load-more-text').text().replace(/查看所有条回复/g, '').replace(/[\s\n\r]/g, '') : null;
  reply = reply ? Number(reply) : (commentData.find('.comment-replies-renderer .comment-renderer').length != 0 ? commentData.find('.comment-replies-renderer .comment-renderer').length : null);
  if (task.commentId == cid) {
    task.isEnd = true;
    task.addCount = index * 20 + index + 1;
    return callback();
  }
  comment = {
    cid,
    content: Utils.stringHandling(commentData.find('.comment-renderer-text-content').text()),
    platform: task.p,
    bid: task.bid,
    aid: task.aid,
    support: commentData.first().find('.comment-renderer-like-count .off').text(),
    reply,
    c_user: {
      uid: commentData.first().find('.comment-author-text').attr('data-ytid'),
      uname: commentData.first().find('.comment-author-text').text(),
      uavatar: commentData.first().find('.yt-thumb-clip img').attr('src')
    }
  };
  if (!comment.reply) {
    delete comment.reply;
  }
  Utils.commentCache(this.core.cache_db, comment);
				// Utils.saveCache(this.core.cache_db,'comment_cache',comment)
  index++;
  cb();
},
			(err, result) => {
  callback();
}
		);
  }
}

module.exports = dealWith;
