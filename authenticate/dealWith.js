/**
 *  update by pnghui on 2017/4/28
 * */
const URL = require('url');
const cheerio = require('cheerio');
const request = require('../lib/request');
const async = require('async');
const req = require('request');

const jsonp = data => data;
const _Callback = data => data;
let logger; // api;
class DealWith {
  constructor(core) {
    logger = core.settings.logger;
    // api = core.settings.servantAPI;
    logger.debug('处理器实例化...');
  }
  youku(verifyData, callback) {
    /*
     * 通过匹配出来的vid(视频ID)，请求评论列表
     * */
    const verifyCode = verifyData.verifyCode,
      option = {},
      pathname = URL.parse(verifyData.remote, true).pathname,
      vid = pathname.substring(pathname.lastIndexOf('/') + 4);
    let page = 1, sign = true, backDate;
    async.whilst(
      () => sign,
      (cb) => {
        option.url = `https://openapi.youku.com/v2/comments/by_video.json?client_id=c9e697e443715900&video_id=${vid}&page=${page}&count=100`;
        request.get(logger, option, (err, result) => {
          if (err) {
            setTimeout(() => {
              cb();
            }, 100);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('优酷json数据解析失败');
            logger.info('json error: ', result);
            setTimeout(() => {
              cb();
            }, 100);
            return;
          }
          const comments = result.comments;
          if (comments.length === 0) {
            sign = false;
            cb();
            return;
          }
          for (let i = 0; i < comments.length; i += 1) {
            if (verifyCode === comments[i].content) {
              backDate = {
                p: 1,
                name: comments[i].user.name,
                id: comments[i].user.id,
                encode_id: comments[i].link ? comments[i].link.substring(comments[i].link.lastIndexOf('/') + 1) : comments[i].user.link.match(/u\/([\w=]*)/)[1]
              };
              callback(null, backDate);
              return;
            }
          }
          page += 1;
          cb();
          return;
        });
      },
      () => {
        callback(true, { code:105, p:1 });
        return;
      }
    );
  }
  iqiyi(verifyData, callback) {
    /*
     * 乐视视频通过用户输入的详情页地址返回的DOM结构
     * 输入的地址
     * 输入的评论值
     * */
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      htmlData = {
        userVal
      },
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err, { code: 103, p: 2 });
        return;
      }
      const $ = cheerio.load(result.body),
        script = $('script')[6].children[0].data;
      const albumId = script.match(/albumId:\d*/).toString().replace('albumId:', '');
      const tvId = script.match(/tvId:\d*/).toString().replace('tvId:', '');
      htmlData.albumId = albumId;
      htmlData.tvId = tvId;
      this.iqComment(htmlData, (error, message) => {
        if(error){
          logger.debug('评论列表返回的错误');
          callback(error, message);
          return;
        }
        callback(null,message);
      });
    });
  }
  iqComment(htmlData, callback){
    /*
     * 请求评论信息的url参数
     * */
    const option = {
      requests: [
        {
          uri: '/comment/get_video_comments',
          params: {
            page_size: 10,
            page: 0,
            categoryid: 25,
            qitan_comment_type: 1,
            need_total: 1,
            need_subject: true,
            sort: 'add_time'
          }
        },
        {
          uri: '/comment/review/get_review_list',
          params: {
            sort: 'hot',
            need_total: 1,
            escape: 'true'
          }
        }
      ],
      publicParams: {
        tvid: htmlData.tvId,
        qitanid: 0,
        aid: 0,
        usecache: 'true',
        antiCsrf: '461c95a7574f3704d09eee0279cfb01f'
      }
    };
    let sign = 1,
      cycle = true,
      comments,
      dataJson,
      dataUrl,
      parameter;
    async.whilst(
      () => cycle,
      (cb) => {
        // 设置当前页
        // 转换成json字符串格式传递
        // 请求api的路径
        option.requests[0].params.page = sign;
        dataJson = JSON.stringify(option);
        dataUrl = {
          url: `http://api.t.iqiyi.com/qx_api/framework/all_in_one?albumid=${htmlData.albumid}&cb=fnsucc&data=${dataJson}&is_video_page=true`
        };
        request.get(logger, dataUrl, (error, result) => {
          if (error) {
            logger.error('occur error : ', error);
            cb(err);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('爱奇艺json数据解析失败');
            logger.info(result);
            cb(e);
            return;
          }
          comments = result.data.$comment$get_video_comments.data.comments;
          if(comments.length === 0){
            cb('error');
            return;
          }
          // 所需参数比较长直接定义为对象格式传递
          // 用户输入的评论内容
          // 评论列表长度
          // 评论
          parameter = {
            val: htmlData.userVal,
            len: comments.length,
            comments
          };
          this.iqdeal(parameter, (err, user) => {
            if(user){
              //callback(null, user);
              cb(null, user);
              return;
            }
            sign += 1;
            cb();
          });
        });
      },
      (err, result) => {
        if(err){
          err === 'error' ? callback(err, { code: 105, p: 3 }) : callback(err, { code: 103, p: 3 });
          return;
        }
        callback(null, result);
      }
    );
  }
  iqdeal(parameter, callback) {
    /*
     *  判断用户输入的值是否找到,找到直接返回用户信息，否则返回null
     * */
    const user = {};
    for (let i = 0; i < parameter.len; i += 1) {
      if (parameter.val === parameter.comments[i].content.replace(/\s/g, '')) {
        user.p = 2;
        user.id = parameter.comments[i].userInfo.uid;
        user.name = parameter.comments[i].userInfo.uname;
        callback(null, user);
        return;
      }
    }
    callback(null, null);
  }
  le(verifyData, callback) {
    /*
     * 乐视视频通过用户输入的详情页地址返回的DOM结构
     * */
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      htmlData = {},
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err, { code: 103, p: 3 });
        return;
      }
      const $ = cheerio.load(result.body),
        script = $('script')[0].children[0].data;
      if (!script) {
        logger.debug('乐视请求的源码结构发生改变');
        callback(true, { code: 103, p: 3 });
        return;
      }
      const cid = script.match(/cid: \d*/).toString().replace('cid: ', ''),
        pid = script.match(/pid: \d*/).toString().replace('pid: ', ''),
        vid = script.match(/vid: \d*/).toString().replace('vid: ', '');
      htmlData.cid = cid;
      htmlData.pid = pid;
      htmlData.vid = vid;
      htmlData.userVal = userVal;
      this.leComment(htmlData, (error, message) => {
        if (error) {
          callback(error, message);
          return;
        }
        callback(null, message);
      });
    });
  }
  leComment(htmlData, callback){
    /*
     *  乐视评论列表
     * */
    const option = {};
    let sign = 1,
      comments,
      cycle = true,
      parameter;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://api.my.le.com/vcm/api/list?cid=${htmlData.cid}&type=video&rows=20&page=${sign}&sort=&source=1&listType=1&xid=${htmlData.vid}&pid=${htmlData.pid}&ctype=cmt%2Cimg%2Cvote`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('乐视json数据解析失败');
            logger.info(result.body);
            cb(e);
            return;
          }
          comments = result.data;
          if(comments.length === 0){
            cb('error');
            return;
          }
          parameter = {
            val: htmlData.userVal,
            len: comments.length,
            comments
          };
          this.ledeal(parameter, (error, user) => {
            if (user) {
              cycle = false;
              cb(null, user);
              return;
            }
            sign += 1;
            cb()
          });
        });
      },
      (err, result) => {
        if(err){
          err === 'error' ? callback(err, { code: 105, p: 3 }) : callback(err, { code: 103, p: 3 });
          return;
        }
        callback(null, result);
      }
    );
  }
  ledeal(parameter, callback) {
    const dataJson = {};
    for (let i = 0; i < parameter.len; i += 1) {
      if (parameter.val === parameter.comments[i].content.replace(/\s/g, '')) {
        dataJson.p = 3;
        dataJson.id = parameter.comments[i].user.uid;
        dataJson.name = parameter.comments[i].user.username;
        callback(null, dataJson);
        return;
      }
    }
    callback(null, null)
  }
  tencent(verifyData, callback) {
    const userVal = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      options = {
        url: htmlUrl
      },
      parameter = {};
    request.get(logger, options, (err, data) => {
      if (err) {
        logger.error('occur error: ', err);
        callback(err, { code: 103, p: 4 });
        return;
      }
      let $ = cheerio.load(data.body),
        script = $('script')[3].children[0].data,
        vid = script.match(/vid: \"([\w\d]*)/)[1];
      parameter.vid = vid;
      parameter.userVal = userVal;
      this.txCommentId(parameter, (error, message) => {
        if (error) {
          callback(error, message);
          return;
        }
        callback(null, message);
      });
    });
  }
  txCommentId(parameter, callback){
    const option = {
      url: `https://ncgi.video.qq.com/fcgi-bin/video_comment_id?otype=json&op=3&vid=${parameter.vid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err, { code: 103, p: 4 });
        return;
      }
      try {
        result = JSON.parse(result.body.replace(/QZOutputJson=/, '').replace(/;/, ''));
      } catch (e) {
        logger.error('腾讯json数据解析失败');
        logger.info('json error: ', data);
        callback(e, { code: 103, p: 4 });
        return;
      }
      const commentId = result.comment_id;
      parameter.cid = commentId;
      this.txCommentList(parameter, (error, message) => {
        if (error) {
          callback(error, message);
          return;
        }
        callback(null, message);
      });
    });
  }
  txCommentList(parameter, callback){
    const option = {},
      user = {};
    let cycle = true,
      commentId = '',
      comments;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `https://coral.qq.com/article/${parameter.cid}/comment?reqnum=10&commentid=${commentId}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }

          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('腾讯json数据解析失败');
            logger.info('json error: ', result);
            cb(e);
            return;
          }
          comments = result.data.commentid;
          if (comments.length === 0) {
            cb('error');
            return;
          }
          for (let i = 0; i < comments.length; i++) {
            if (parameter.userVal === comments[i].content) {
              user.p = 4;
              user.id = comments[i].userinfo.userid;
              user.name = comments[i].userinfo.nick;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          commentId = result.data.last;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 4}) : callback(err, { code: 103, p: 4});
          return ;
        }
        callback(null, result);
      }
    );
  }
  meipai(verifyData, callback) {
    let urlId = verifyData.remote.match(/media\/\d*/).toString().replace(/media\//, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      sign = 1,
      cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        const options = {
          url: `http://www.meipai.com/medias/comments_timeline?page=${sign}&count=10&id=${urlId}`
        };
        request.get(logger, options, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('美拍json数据解析失败');
            logger.info(result);
            cb(e);
            return;
          }
          if(result.length === 0){
            cb('error');
            return;
          }
          this.mpdeal(userVal, result, (error, user) => {
            if (user) {
              cycle = false;
              cb(null, user);
              return;
            }
            sign++;
            cb();
          });
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 5}) : callback(err, { code: 103, p: 5});
          return;
        }
        callback(null, result);
      }
    );
  }
  mpdeal(userVal, contents, callback) {
    const user = {};
    for (let i = 0; i < contents.length; i++) {
      if (userVal === contents[i].content.replace(/\s/g, '')) {
        user.p = 5;
        user.id = contents[i].user.id;
        user.name = contents[i].user.screen_name;
        callback(null, user);
        return;
      }
    }
    callback(null, null);
  }
  toutiao(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).host,
      options = {};
    let sign = 1,
      cycle = true,
      comments,
      groupid = '',
      offset = 0;
    if (host === 'www.365yg.com' || host === 'm.365yg.com') {
      groupid = htmlUrl.match(/group\/(\d*)/) ? htmlUrl.match(/group\/(\d*)/)[1] : (htmlUrl.match(/item\/(\d*)/) ? htmlUrl.match(/item\/(\d*)/)[1] : htmlUrl.match(/\/i(\d*)/)[1]);
    }else {
      groupid = htmlUrl.match(/\/a\d*/).toString().replace(/\/a/, '');
    }
    async.whilst(
      () => cycle,
      (cb) => {
        options.url = `http://ib.snssdk.com/article/v1/tab_comments/?tab_index=1&count=50&group_id=${groupid}&offset=${offset}`;
        request.get(logger, options, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('头条json数据解析失败');
            logger.info(result.body);
            cb(e);
            return;
          }
          comments = result.data;
          if(comments.length === 0){
            cb('error');
            return;
          }
          this.ttdeal(userVal, comments, (error, user) => {
            if (user) {
              cycle = false;
              cb(null, user);
              return;
            }
            offset += 50;
            cb()
          });
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 6 }) : callback(err, { code: 103, p: 6 });
          return;
        }
        callback(null, result);
      }
    );
  }
  ttdeal(userVal, comments, callback) {
    const user = {};
    for (let i = 0; i < comments.length; i++) {
      if (userVal == comments[i].comment.text.replace(/\s/g, '')) {
        user.p = 6;
        user.id = comments[i].comment.user_id;
        user.name = comments[i].comment.user_name;
        callback(null, user);
        return;
      }
    }
    callback(null, null)
  }
  miaopai(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      scid = htmlUrl.match(/show\/([\w | ~ | \d | -]*)/)[1],
      option = {
        url: htmlUrl
      },
      $, oli, liLength, cycle = true, page = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://www.miaopai.com/miaopai/get_v2_comments?scid=${scid}&per=10&page=${page}`;
        request.get(logger, option, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          $ = cheerio.load(data.body);
          oli = $('li');
          liLength = oli.length;
          if (liLength === 0) {
            cycle = false;
            cb();
            return;
          }
          this.miaopaiComment({ oli, liLength, userVal }, (error, user) => {
            if (error) {
              cb(error);
              return;
            }
            if (user) {
              cycle = false;
              cb(null, user);
              return;
            }
            page += 1;
            cb();
          });
        });
      },
      (err, result) => {
        if (err) {
          logger.debug(0);
          callback(err, { code: 103, p: 7 });
          return;
        }
        if (result) { logger.debug(11111111); callback(null,result); return; }
        logger.debug(2222222);
        callback(true, { code: 105, p: 7 });
      }
    );
  }
  miaopaiComment( parameter, callback ){
    let content, suidUrl, _nick, user = {}, $, uid, index = 0;
    async.whilst(
      () => index < parameter.liLength,
      (cb) => {
        parameter.oli.find('div>span').eq(index).children().empty();
        content = parameter.oli.find('div>span').eq(index).text();
        suidUrl = parameter.oli.find('div>a').eq(index).attr('href');
        _nick = parameter.oli.find('div>a>b').eq(index).text();
        suidUrl = {
          url: `http://www.miaopai.com${suidUrl}/relation/follow.htm`
        };
        content = content.replace(/回复/, '').replace(/\s/g,'');
        if (parameter.userVal == content) {
          request.get(logger, suidUrl, (err, suidData) => {
            if (err) {
              logger.error('occur error : ', err);
              cb(err);
              return;
            }
            $ = cheerio.load(suidData.body);
            uid = $('button.guanzhu.gz').attr('suid');
            if (!uid) {
              logger.debug('秒拍请求的源码结构发生改变');
              cb(e);
              return;
            }
            user.id = uid;
            user.name = _nick;
            user.p = 7;
            parameter.liLength = 0;
            cb(null, user);
          });
          return;
        }
        index += 1;
        cb();
      },
      (err, result) => {
        if(err){
          callback(err);
          return;
        }
        if(result){
          callback(null, result);
          return;
        }
        callback();
      }
    );
  }
  bili(verifyData, callback) {
    const verifyCode = verifyData.verifyCode.replace(/\s/g,''),
      htmlUrl = verifyData.remote, dataJson = {};
    let pn = 1, cycle = true, oid, newUrl, datas, acount, replies;
    async.whilst(
      () => cycle,
      (cb) => {
        oid = htmlUrl.match(/av(\d*)/)[1];
        newUrl = {
          url: `http://api.bilibili.com/x/v2/reply?&nohot=1&type=1&pn=${pn}&oid=${oid}`
        };
        logger.debug(newUrl.url);
        request.get(logger, newUrl, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('哔哩哔哩json数据解析失败');
            logger.info('json error: ', data);
            cb(e);
            return;
          }
          datas = data.data;
          acount = datas.page.acount;
          replies = datas.replies;
          if (replies.length === 0) {
            cycle = false;
            cb();
            return;
          }
          for (let i = 0; i < replies.length; i++) {
            if (verifyCode == replies[i].content.message.replace(/\s/g,'')) {
              dataJson.p = 8;
              dataJson.id = replies[i].member.mid;
              dataJson.name = replies[i].member.uname;
              cycle = false;
              cb(null, dataJson);
              return;
            }
          }
          pn += 1;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err, { code: 103, p: 8 });
          return;
        }
        if (result)
          callback(null, result);
        else
          callback(true, { code: 105, p: 8 });
      }
    );
  }
  sohu(verifyData, callback) {
    /*
     *  通过获取到的视频ID获取topic_id
     * */
    let verifyCode = verifyData.verifyCode.replace(/\s/g, ''),
      htmlUrl = verifyData.remote,
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, data) => {
      if (err) {
        logger.error('occur error: ', err);
        callback(err, { code: 103, p: 9 });
        return;
      }
      data = data.body.replace(/[\s\n\r]/g,'');
      let vid = data.match(/varvid=\'([\d]*)/)[1] || data.match(/vid:\'([\d]*)/)[1],
        loadUrl = {
          url: `http://changyan.sohu.com/api/2/topic/load?client_id=cyqyBluaj&tvsubject_need=true&topic_url=${htmlUrl}&topic_source_id=bk${vid}&page_size=10&elite_size=0&elite_no=1&hot_size=0&_=${new Date().getTime()}`
        };
      this.souhuTopicId(loadUrl, verifyCode, (error, user) => {
        if (error) {
          callback(error, { code: 105, p: 9 });
          return;
        }
        if (user)
          callback(null, user);
        else
          callback(true, { code: 105, p: 9 });
      })
    });
  }
  souhuTopicId(loadUrl, verifyCode, callback){
    /*
     *  获取topic_id
     * */
    request.get(logger, loadUrl, (err, data) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      try {
        data = JSON.parse(data.body);
      } catch (e) {
        logger.error('搜狐json数据解析失败');
        logger.info('json error: ', data);
        callback(e);
        return;
      }
      const topic_id = data.topic_id,
        parameter = {
          topic_id,
          verifyCode
        };
      this.souhuComent(parameter, (error, user) => {
        if (error) {
          callback(error);
          return;
        }
        if (user)
          callback(null, user);
        else
          callback(null,null);

      })
    });
  }
  souhuComent(parameter, callback){
    /*
     *  获取用户输入的值，与获取回来的评论内容匹配
     * */
    const newUrl = {}, user = {};
    let comments, page = 0, cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        newUrl.url = `http://changyan.sohu.com/api/2/topic/comments?client_id=cyqyBluaj&page_no=${page}&page_size=10&topic_id=${parameter.topic_id}`;
        request.get(logger, newUrl, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('搜狐json数据解析失败');
            logger.info('json error: ', data);
            cb(e);
            return;
          }
          comments = data.comments;
          if (comments.length === 0) {
            cycle = false;
            cb();
            return;
          }
          for (let i = 0; i < comments.length; i++) {
            if (parameter.verifyCode == comments[i].content.replace(/\s/g,'')) {
              user.p = 9;
              user.id = comments[i].passport.user_id;
              user.name = comments[i].passport.nickname;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page++;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        if (result)
          callback(null, result);
        else
          callback(null,null);
      }
    );
  }
  kuaibao(verifyData, callback) {
    /*
     *  获取评论ID commentId
     * */
    let htmlUrl = verifyData.remote,
      commentid = htmlUrl.match(/commentid=([\d]*)/),
      userVal = verifyData.verifyCode.replace(/\s/g, '');
    const options = {
      url: htmlUrl
    };
    if (!commentid){
      request.get(logger, options, (err, result) => {
        if (err) {
          logger.debug('评论ID请求失败');
          callback(err, { code: 103, p: 10 });
          return;
        }
        result = result.body.replace(/[\s\n\r]/g,'');
        commentid = result.match(/varcommentId=\"(\d*)/)[1];
        this.kbComment( userVal, commentid, (error, user) => {
          if (error) {
            error === 'error' ? callback(error, { code: 105, p: 10 }) : callback(error, { code: 103, p: 10 });
            return;
          }
          callback(null, user);
        })
      });
      return;
    }
    commentid = commentid[1];
    this.kbComment( userVal, commentid, (err, user) => {
      if (err) {
        err === 'error' ? callback(err, { code: 105, p: 10 }) : callback(err, { code: 103, p: 10 });
        return;
      }
      callback(null, user);
    })
  }
  kbComment( userVal, commentid, callback ){
    const options = {};
    let cycle = true, commenLast = '', contents;
    async.whilst(
      () => cycle,
      (cb) => {
        options.url = `http://coral.qq.com/article/${commentid}/comment?commentid=${commenLast}&reqnum=10`;
        request.get(logger, options, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('快报json数据解析失败');
            logger.info(data);
            cb(e);
            return;
          }
          commenLast = data.data.last;
          contents = data.data.commentid;
          if (contents.length === 0) {
            cycle = false;
            cb('error');
            return;
          }
          this.kbdeal(userVal, contents, (error, user) => {
            if (user) {
              cycle = false;
              cb(null, user);
            } else {
              cb();
            }
          });
        });
      },
      (err, result) => {
        if(err){
          callback(err);
          return;
        }
        callback(null,result);
      }
    );
  }
  kbdeal(userVal, contents, callback) {
    const user = {};
    for (let i = 0; i < contents.length; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        user.p = 10;
        user.id = contents[i].userinfo.userid;
        user.name = contents[i].userinfo.nick;
        callback(null, user);
        return;
      }
    }
    callback();
  }
  yidian(verifyData, callback) {
    /*
     *  没有用户ID
     * */
  }
  tudou(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, htmlData) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err, { code: 103, p: 12 });
        return;
      }
      let comments = htmlData.body,
        vid = comments.match(/vid: (\d*), isShow/)[1];
      if (!vid) {
        logger.debug('土豆请求的源码结构发生改变');
        callback(e, { code: 103, p: 12 });
        return;
      }
      this.tdComment(userVal, vid, (error, data) => {
        if (error) {
          error === 'error' ? callback(error, { code: 105, p: 12 }) : callback(error, { code: 103, p: 12 });
          return;
        }
        callback(null, data);
      });
    });
  }
  tdComment(userVal, vid, callback){
    const user = {}, dataUrl = {};
    let cycle = true,
      page = 1,
      contents;
    async.whilst(
      () => cycle,
      (cb) => {
        dataUrl.url = `https://openapi.youku.com/v2/comments/by_video.json?client_id=c9e697e443715900&video_id=${vid}&page=${page}&count=100`;
        request.get(logger, dataUrl, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('土豆json数据解析失败');
            logger.info(data);
            cb(e);
            return;
          }
          contents = data.comments;
          if(contents.length === 0){
            cycle = false;
            cb('error');
            return;
          }
          for (let i = 0; i < contents.length; i++) {
            if (userVal == contents[i].content.replace(/\s/g, '')) {
              user.p = 12;
              user.id = contents[i].user.id;
              user.name = contents[i].user.name;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb()
        });
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, result)
      }
    );
  }
  baomihua(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, htmlData) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err, { code: 103, p: 13 });
        return;
      }
      let $ = cheerio.load(htmlData.body),
        script = $('script')[0].children[0].data,
        flvid = script.match(/var flvid = (\d*)/)[1];
      if (!flvid) {
        logger.debug('爆米花请求的源码结构发生改变');
        callback(e, { code: 103, p: 13 });
        return;
      }
      this.bmComment(userVal, flvid, (error, user) => {
        if (error) {
          error === 'error' ? callback(error, { code: 105, p: 13 }) : callback(error, { code: 103, p: 13 });
          return;
        }
        callback(null, user);
      });
    });
  }
  bmComment(userVal, flvid, callback){
    let cycle = true,
      page = 1,
      contents,
      beginCid = null;
    const dataUrl = {}, user = {};
    async.whilst(
      () => cycle,
      (cb) => {
        dataUrl.url = ` http://m.interface.baomihua.com/Interfaces/getlist.ashx?objid=${flvid}&page=${page}&type=rlist&vs=36`;
        request.get(logger, dataUrl, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body.replace(/[\n\\]/g,''));
          } catch (e) {
            logger.error('爆米花json数据解析失败');
            logger.info(data);
            cb(e);
            return;
          }
          contents = data.result.item;
          if (!beginCid) {
            beginCid = contents[0].reviewID
          };
          if (beginCid == contents[0].reviewID) {
            logger.debug('当前评论翻页失效');
            callback('NO', { code: 103, p: 13 });
            return;
          }
          if (contents.length === 0) {
            cb('error');
            return;
          }
          for (let i = 0; i < contents.length; i++) {
            if (userVal == contents[i].content.replace(/\s/g, '')) {
              user.p = 13;
              user.id = contents[i].user.userID;
              user.name = contents[i].user.nickName;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, result);
      }
    );
  }
  ku6(verifyData, callback) {
    const htmlUrl = verifyData.remote.match(/show\/\-*\w*\-*\w*\-*\w*\.{2}/).toString().replace(/show\//, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      user = {},
      option = {};
    let cycle = true,
      page = 1,
      contents;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://comment.ku6.com/api/list.jhtm?id=${htmlUrl}&vtype=111&type=2&size=10&pn=${page}`;
        logger.debug(option.url);
        request.get(logger, option, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('ku6json数据解析失败');
            logger.info(data);
            cb(e);
            return;
          }
          contents = data.data.list;
          if (!contents) {
            cb('error');
            return;
          }
          for (let key in contents){
            if (userVal == contents[key].commentContent.replace(/\s/g, '')) {
              user.p = 14;
              user.id = contents[key].commentAuthorId;
              user.name = contents[key].commentAuthor || contents[i].partner.p_username;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb()
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 14 }) : callback(err, { code: 103, p: 14 });
          return;
        }
        callback(null, result);
      }
    );
  }
  btime(verifyData, callback) {
    const verifyCode = verifyData.verifyCode.replace(/[\s\n\r]/g, ''),
      htmlUrl = verifyData.remote,
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        callback(err);
        return;
      }
      result = result.body.replace(/[\n\r\s]/g, '');
      const itemkey = encodeURIComponent(result.match(/itemkey:'([\w\d%\.]*)',/)[1]);
      this.btComment(verifyCode, itemkey, (error, user) => {
        if (error) {
          error === 'error' ? callback(error, { code: 105, p: 15 }) : callback(error, { code: 103, p: 15 });
          return;
        }
        callback(null, user);
      });
    });
  }
  btComment(verifyCode, itemkey, callback){
    const dataUrl = {},
      user = {};
    let cycle =true,
      page = 1,
      comments;
    async.whilst(
      () => cycle,
      (cb) => {
        dataUrl.url = `http://gcs.so.com/comment/lists?type=1&num=5&sub_limit=5&page=${page}&client_id=25&url=${itemkey}`;
        request.get(logger, dataUrl, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('北京时间json数据解析失败');
            logger.info('json error: ', result);
            cb(e);
            return;
          }
          comments = result.data.comments;
          if (comments.length <= 0) {
            cycle = false;
            cb('error');
            return;
          }
          for (let i = 0; i < comments.length; i += 1) {
            if (verifyCode == comments[i].message) {
              user.p = '15';
              user.name = JSON.parse(comments[i].user_info).nick_name;
              user.id = comments[i].id;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page++;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, result);
      }
    );
  }
  weishi(verifyData, callback) {
    const _id = verifyData.remote.match(/\/t\/\d*/).toString().replace(/\/t\//, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      user = {},
      options = {};
    let cycle = true,
      pageflag = 1,
      lastid = '',
      contents,
      pagetime = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        options.url = `http://wsi.weishi.com/weishi/t/relist.php?v=p&g_tk=45991169&r=1479868708804&id=${_id}&pageflag=${pageflag}&pagetime=${pagetime}&lastid=${lastid}&reqnum=5`;
        options.referer = `http://weishi.qq.com/t/${_id}`;
        request.get(logger, options, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('微视json数据解析失败', data.body);
            cb(e);
            return;
          }
          contents = data.data.info;
          if (!contents || contents.length <= 0) {
            cycle = false;
            cb('error');
            return;
          }
          for (let i = 0; i < contents.length; i++) {
            if (userVal == contents[i].text.replace(/\s/g, '')) {
              user.p = 16;
              user.id = contents[i].uid;
              user.name = contents[i].name;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          pagetime = contents[contents.length - 1].timestamp;
          lastid = contents[contents.length - 1].id;
          pageflag = 2;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 16 }) : callback(err, { code: 103, p: 16 });
          return;
        }
        callback(null, result);
      }
    );
  }
  xiaoying(verifyData, callback) {
    const verifyCode = verifyData.verifyCode.replace(/\s/g, ''),
      htmlUrl = verifyData.remote,
      vid = htmlUrl.match(/\/v\/([\w]*)/)[1],
      options = {
        method: 'POST',
        url: 'http://viva.api.xiaoying.co/api/rest/d/dg',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'User-Agent': 'XiaoYing/5.3.5 (iPhone; iOS 10.1.1; Scale/3.00)'
        },
        form: {
          a: 'dg',
          b: '1.0',
          c: '20007700',
          e: 'DIqmr4fb',
          i: '{"a":"[I]a8675492c8816a22c28a1b97f890ae144a8a4fa3","b":"zh_CN"}',
          j: '6a0ea6a13e76e627121ee75c2b371ef2',
          k: 'xysdkios20130711'
        }
      };
    req(options, (error, response, body) => {
      if (error) {
        callback(error);
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        callback(e);
        return;
      }
      /* 初始获取验证 h 的值 */
      const parameter = {
        h: body.a.a,
        verifyCode,
        vid
      };
      this.xyComment(parameter, (error, user) => {
        if (error) {
          error === 'error' ? callback(error, { code: 105, p: 17 }) : callback(error, { code: 105, p: 17 });
          return;
        }
        callback(null, user)
      });
    });
  }
  xyComment(parameter, callback) {
    const user = {},
      option = {
        method: 'POST',
        url: 'http://viva.api.xiaoying.co/api/rest/p/pa',
        form:
          {
            a: 'pa',
            b: '1.0',
            c: '20008400',
            e: 'DIqmr4fb',
            h: parameter.h,
            j: 'ae788dbe17e25d0cff743af7c3225567',
            k: 'xysdkios20130711'
          },
        headers:
          {
            'content-type': 'application/x-www-form-urlencoded',
            'user-agent': 'XiaoYing/5.5.6 (iPhone; iOS 10.2.1; Scale/3.00)'
          }
      };
    let page = 1,
      cycle = true,
      comments;
    async.whilst(
      () => cycle,
      (cb) => {
        option.form.i = `{"d":20,"b":"1","c":${page},"a":"${parameter.vid}"}`;
        req(option, (error, response, body) => {
          if (error) {
            logger.debug('小影请求失败', error);
            cb(error);
            return;
          }
          try {
            body = JSON.parse(body);
          } catch (e) {
            logger.error('小影json数据解析失败', body);
            cb(e);
            return;
          }
          comments = body.comments;
          if (comments.length <= 0) {
            cycle = false;
            cb('error');
            return;
          }
          for (let i = 0; i < comments.length; i++) {
            if (parameter.verifyCode == comments[i].content.replace(/\s/g, '')) {
              user.p = '17';
              user.name = comments[i].user.nickName;
              user.id = comments[i].user.auid;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, result);
      }
    );
  }
  budejie(verifyData, callback) {
    const verifyCode = verifyData.verifyCode.replace(/\s/g, ''),
      htmlUrl = verifyData.remote,
      user = {},
      option = {};
    let data_id = htmlUrl.match(/(\d*).html/)[1],
      cycle = true, page = 1, comments;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://api.budejie.com/api/api_open.php?a=datalist&per=20&c=comment&data_id=${data_id}&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('不得姐json数据解析失败', result);
            cb(e);
            return;
          }
          if (!result || result == '') {
            cb('error');
            return;
          }
          comments = result.data;
          for (let i = 0; i < comments.length; i++) {
            if (verifyCode == comments[i].content.replace(/\s/g, '')) {
              user.p = '18';
              user.name = comments[i].user.username;
              user.id = comments[i].user.id;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 18 }) : callback(err, { code: 103, p: 18 });
          return;
        }
        callback(null, result);
      }
    );
  }

  neihan(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).host,
      options = {},
      user = {};
    let groupId = null,
      cycle = true,
      offset = 0,
      contents;
    if (host == 'm.neihanshequ.com') {
      groupId = htmlUrl.match(/group\/(\d*)/)[1];
    } else {
      groupId = htmlUrl.match(/\/p(\d*)/)[1];
    }
    async.whilst(
      () => cycle,
      (cb) => {
        options.url = `http://neihanshequ.com/m/api/get_essay_comments/?group_id=${groupId}&app_name=neihanshequ_web&offset=${offset}`;
        request.get(logger, options, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('内涵段子json数据解析失败');
            logger.info(data);
            cb(e);
            return;
          }
          contents = data.data.recent_comments;
          if (contents.length <= 0) {
            cb('error');
            return;
          }
          for (let i = 0; i < contents.length; i++) {
            if (userVal == contents[i].text.replace(/\s/g, '')) {
              user.p = 19;
              user.id = contents[i].user_id;
              user.name = contents[i].user_name;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          offset += 20;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 19 }) : callback(err, { code: 103, p: 19 });
          return;
        }
        callback(null, result);
      }
    );
  }
  yy(verifyData, callback) {
    const verifyCode = verifyData.verifyCode.replace(/\s/g, ''),
      htmlUrl = verifyData.remote,
      pathname = URL.parse(htmlUrl, true).pathname.split('/'),
      user = {},
      option = {},
      vid = pathname[2];
    let index = 0,
      cycle = true,
      comments, type;
    switch (pathname[1]) {
      case 'x':
        type = 6; break;
      case 'd':
        type = 4; break;
      case 's':
        type = 3; break;
      default:
        type = 4;
    }
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://www.yy.com/video/play/page/danmu?resid=${vid}&type=${type}&index=${index}&size=100`;
        request.get(logger, option, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('YYjson数据解析失败', data.body);
            cb(e);
            return;
          }
          comments = data.data.list;
          if (comments.length <= 0) {
            cb('error');
            return;
          }
          for (let i = 0; i < comments.length; i++) {
            if (verifyCode == comments[i].content.replace(/\s/g, '')) {
              user.p = '20';
              user.name = comments[i].nickname;
              user.id = comments[i].yyno;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          index += 100;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 20 }) : callback(err, { code: 103, p: 20 });
          return;
        }
        callback(null, result);
      }
    );
  }

  tv56(verifyData, callback) {
    let htmlUrl = URL.parse(verifyData.remote, true),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = htmlUrl.hostname,
      path = htmlUrl.pathname,
      option = {
        url: verifyData.remote
      },
      vid = null;
    if (host == 'www.56.com' || host == 'm.56.com') {
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          callback(err, { code: 103, p: 21 });
          return;
        }
        const $ = cheerio.load(result.body);
        result = result.body.replace(/[\s\n\r]/g, '');
        vid = result.match(/sohuVideoInfo=\{vid:\'\d*/).toString().replace(/sohuVideoInfo=\{vid:\'/, '');
        this.getTV56(userVal, vid, (error, user) => {
          if (error) {
            error === 'error' ? callback(error, { code: 105, p: 21 }) : callback(error, { code: 103, p: 21 });
            return;
          }
          callback(null, user);
        });
      });
    } else {
      vid = path.match(/vw\/\d*/).toString().replace(/vw\//, '');
      this.getTV56(userVal, vid, callback);
    }
  }
  getTV56(userVal, vid, callback) {
    const option = {
      url: `http://changyan.sohu.com/api/3/topic/liteload?client_id=cyqyBluaj&page_size=30&hot_size=5&topic_source_id=bk${vid}&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('TV56评论总量解析失败', result.body);
        callback(e);
        return;
      }
      this.getTV56comment(userVal, result.cmt_sum, result.topic_id, (error, user) => {
        callback(error, user);
      });
    });
  }
  getTV56comment(userVal, num, vid, callback) {
    const option = {}, user = {};
    let sign = 1, contents,
      page = num % 30 === 0 ? num / 30 : Math.ceil(num / 30);
    async.whilst(
      () => sign <= page,
      (cb) => {
        option.url = `http://changyan.sohu.com/api/2/topic/comments?client_id=cyqyBluaj&page_size=30&topic_id=${vid}&page_no=${sign}&_=${new Date().getTime()}`;
        request.get(logger, option, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('tv56 json数据解析失败');
            logger.info(data);
            cb(e);
            return;
          }
          contents = data.comments;
          for (let i = 0; i < contents.length; i += 1) {
            if (userVal == contents[i].content.replace(/\s/g, '')) {
              user.p = 21;
              user.id = contents[i].passport.user_id;
              user.name = contents[i].passport.nickname;
              page = 0;
              callback(null, user);
              return;
            }
          }
          sign += 1;
          cb();
        })
      },
      (err, result) => {
        if (err) {
          callback(err);
        } else if (result) {
          callback(null, result)
        } else {
          callback('error')
        }
      }
    );
  }
  acfun(verifyData, callback) {
    const verifyCode = verifyData.verifyCode.replace(/\s/, ''),
      htmlUrl = verifyData.remote,
      contentId = htmlUrl.match(/\/ac[\d]*/).toString().replace('/ac', ''),
      user = {};
    let commentContentArr, cycle = true, page = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        options.url = `http://www.acfun.tv/comment_list_json.aspx?isNeedAllCount=true&contentId=${contentId}&currentPage=${page}`;
        // console.log(options.url);
        request.get(logger, options, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('A站json数据解析失败');
            logger.info('json error: ', data);
            cb(e);
            return;
          }
          commentContentArr = data.data.commentContentArr;
          if (!commentContentArr || commentContentArr == '') {
            cb('error');
            return;
          }
          for (const current in commentContentArr) {
            if (verifyCode == commentContentArr[current].content.replace(/\s/g, '')) {
              user.p = '22';
              user.name = commentContentArr[current].userName;
              user.id = commentContentArr[current].userID;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 22 }) : callback(err, { code: 103, p: 22 });
          return;
        }
        callback(null, result);
      }
    );
  }
  weibo(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).hostname,
      query = URL.parse(htmlUrl, true).query,
      option = {},
      user = {};
    let vid = '',
      page = 1,
      cycle = true,
      contents = '';

    if (host == 'm.weibo.cn') {
      vid = URL.parse(htmlUrl, true).pathname.split('/')[2];
      if (query.sourcetype || query.lfid) {
        vid = htmlUrl.match(/(\d*)?/)[1];
      }
    } else {
      callback('err', { code: 102, p: 23 });
      return;
    }
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://m.weibo.cn/article/rcMod?id=${vid}&type=comment&page=${page}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('微博数据解析失败');
            cb(e);
            return;
          }
          contents = result.data;
          if (!contents || contents == '') {
            cb('error');
            return;
          }
          for (let i = 0; i < contents.length; i += 1) {
            logger.debug(userVal, '---', contents[i].text);
            if (userVal == contents[i].text.replace(/\s/g, '')) {
              user.p = 23;
              user.id = contents[i].user.id;
              user.name = contents[i].user.screen_name;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 23 }) : callback(err, { code: 103, p: 23 });
          return;
        }
        callback(null, result);
      }
    );
  }

  ifeng(verifyData, callback) {
    const userVal = verifyData.verifyCode.replace(/\s/g, ''),
      htmlUrl = verifyData.remote,
      option = {
        ua: 1
      };
    let vid, cid;
    if (htmlUrl.match(/video_(\d*)/)) {
      vid = htmlUrl.match(/video_(\d*)/)[1];
    } else {
      vid = htmlUrl.match(/video\/(\d*)/)[1];
    }
    option.url = `http://v.ifeng.com/docvlist/${vid}-1.js`;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论ID请求失败', err);
        callback(err, { code: 103, p: 24 });
        return;
      }
      result = result.body;
      if (!result || result.length <= 0 || result.match(/404.shtml/)) {
        logger.debug('该视频已被删除', result.match(/404.shtml/)[0]);
        callback('err', { code: 103, p: 24 });
        return;
      }
      const startIndex = result.indexOf('var data='),
        endIndex = result.indexOf(';bsCallback.getSinglePage');
      if ((startIndex || endIndex) === -1) {
        logger.debug('没有评论', startIndex, '---', endIndex);
        callback('err', { code: 103, p: 24 });
        return;
      }
      let data = result.substring(startIndex + 9, endIndex);
      try {
        data = JSON.parse(data);
      } catch (e) {
        logger.debug('vid数据解析失败', data);
        callback(e, { code: 103, p: 24 });
        return;
      }
      this.ifengComment( data.dataList[0].guid, userVal, (error, user) => {
        if (error) {
          callback(error, {code: 105, p: 24});
          return;
        }
        callback(null, user)
      });
    });
  }

  ifengComment( cid, userVal, callback ) {
    const options = {}, user = {};
    let cycle = true,
      page = 1,
      comments;
    async.whilst(
      () => cycle,
      (cb) => {
        options.url = `http://comment.ifeng.com/geti?pagesize=10&type=new&docUrl=${cid}&p=${page}`;
        request.get(logger, options, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('凤凰卫视json数据解析失败', result.body);
            cb();
            return;
          }
          comments = result.comments.newest;
          if (!comments || comments.length <= 0) {
            cb('error');
            return;
          }
          for (let i = 0; i < comments.length; i += 1) {
            if (userVal == comments[i].comment_contents.replace(/\s/g, '')) {
              user.p = '24';
              user.name = comments[i].uname;
              user.id = comments[i].user_id;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, result);
      }
    );
  }
  wangyi(verifyData, callback) {
    const userVal = verifyData.verifyCode.replace(/\s/, ''),
      htmlUrl = verifyData.remote,
      user = {},
      option = {};
    let cycle = true, offset = 0,
      vid = htmlUrl.match(/(\w*)\.html/)[1];
    vid = vid.substring(0,1) == 'V' ? vid.replace('V', '') : vid;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/${vid}008535RB/app/comments/newList?offset=${offset}&limit=20`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb(err);
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('网易json数据解析失败', result);
            cb(e);
            return;
          }
          let comments = result.comments;
          if (!result.commentIds || result.commentIds <= 0) {
            cb('error');
            return;
          }
          for (const comment in comments) {
            if (userVal == comments[comment].content.replace(/\s/, '')) {
              user.p = '25';
              user.id = comments[comment].user.userId;
              user.name = comments[comment].user.nickname;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          offset += 20;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 25 }) : callback(err, { code: 103, p: 25 });
          return;
        }
        callback(err, result)
      }
    );
  }

  uc(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      host = URL.parse(htmlUrl, true).hostname,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      option = {},
      parameter = {
        userVal
      };
    let bid = null,
      aid = null,
      articleId = null;
    if (host == 'v.mp.uc.cn') {
      articleId = URL.parse(htmlUrl, true).query.wm_aid;
      option.url = `http://napi.uc.cn/3/classes/article/objects/${articleId}?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_ch=article`;
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          callback(err, { code: 102, p: 26 });
          return;
        }
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.error('UCjson数据解析失败', result.body);
          callback(e, { code: 102, p: 26 });
          return;
        }
        parameter.aid = result.data.xss_item_id;
        this.getUClist(parameter, (error, user) => {
          if (error) {
            error === 'error' ? callback(error, { code: 105, p: 26 }) : callback(error, { code: 103, p: 26 });
            return;
          }
          callback(null, user);
        });
      });
    } else if (host == 'news.uc.cn') {
      parameter.aid = htmlUrl.match(/a_(\d*)/)[1];
      this.getUClist(parameter, (error, user) => {
        if (error) {
          error === 'error' ? callback(error, { code: 105, p: 26 }) : callback(error, { code: 103, p: 26 });
          return;
        }
        callback(null, user);
      });
    } else {
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          callback(err, { code: 102, p: 26 });
          return;
        }
        let $ = cheerio.load(result.body),
          script;
        if (host == 'tc.uc.cn') {
          script = $('script')[0].children[0].data;
        } else {
          script = $('script')[1].children[0].data;
        }
        bid = script.match(/mid=\w*/) == undefined ? '' : script.match(/mid=\w*/).toString().replace(/mid=/, '');
        if (bid == '') {
          aid = script.match(/aid=\d*/).toString().replace(/aid=/, '');
          parameter.aid = aid;
          this.getUClist(parameter, (error, user) => {
            if (error) {
              error === 'error' ? callback(error, { code: 105, p: 26 }) : callback(error, { code: 103, p: 26 });
              return;
            }
            callback(null, user);
          });
        }
      });
    }
  }
  getUClist( parameter, callback ) {
    const user = {}, options = {};
    let cycle = true,
      hotScore = '',
      comments;
    async.whilst(
      () => cycle,
      (cb) => {
        options.url = `http://m.uczzd.cn/iflow/api/v2/cmt/article/${parameter.aid}/comments/byhot?count=10&fr=iphone&dn=11341561814-acaf3ab1&hotValue=${hotScore}`;
        request.get(logger, options, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            cb();
            return;
          }
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.debug('UC数据解析失败', data.body);
            cb(e);
            return;
          }
          comments = data.data.comments_map;
          if (!data.data.comments || data.data.comments == '' || data.data.comments.length <= 0) {
            cb('error');
            return;
          }
          for (const comment in comments) {
            if (parameter.userVal == comments[comment].content.replace(/\s/g, '')) {
              user.p = 26;
              user.id = comments[comment].ucid_sign;
              user.name = comments[comment].user.nickname;
              cycle = false;
              cb(null, user);
              return;
            }
            hotScore = comments[comment].hotScore;
          }
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, result);
      }
    );
  }

  mgtv(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).hostname,
      option = {},
      user = {};
    let vid = '',
      cycle = true,
      page = 1,
      contents = '';
    if (host == 'www.mgtv.com') {
      vid = htmlUrl.match(/\/(\d*)\.html/)[1];
    } else {
      vid = htmlUrl.match(/\/(\d*)\?/)[1];
    }
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://comment.hunantv.com/comment/read?device=iPhone&pageCount=${page}&pageSize=30&videoId=${vid}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('芒果TV数据解析失败');
            cb();
            return;
          }
          contents = result.data;
          if (result.data.length <= 0) {
            cb('error');
            return;
          }
          for (let i = 0; i < result.data.length; i += 1) {
            if (userVal == contents[i].comment.replace(/\s/g, '')) {
              user.p = 27;
              user.id = contents[i].commentId;
              user.name = contents[i].commentBy;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err, { code: 105, p: 27 });
          return;
        }
        callback(null, result);
      }
    );
  }

  qzone(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).hostname,
      option = {},
      parameter = {
        userVal
      };
    let uin = '',
      tid = '';
    if (host == 'user.qzone.qq.com') {
      uin = htmlUrl.match(/com\/(\d*)/)[1];
      tid = htmlUrl.match(/mood\/(\w*)/)[1];
    } else if (host == 'mobile.qzone.qq.com') {
      uin = htmlUrl.match(/&u=(\d*)/)[1];
      tid = htmlUrl.match(/&i=(\w*)/)[1];
    } else if (host == 'h5.qzone.qq.com') {
      uin = htmlUrl.match(/&uin=(\d*)/)[1];
      tid = htmlUrl.match(/&shuoshuo_id=(\w*)/)[1];
    } else {
      option.url = htmlUrl;
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('occur error: ', err);
          this.qzone(verifyData, callback);
          return;
        }
        let $ = cheerio.load(result.body),
          script = $('script')[13].children[0].data,
          data = script.match(/"uin":"\d*","_wv":"\d*","_ws":"\d*","adtag":"\w*","is_video":"\w*","shuoshuo_id":"\w*","data/).toString().replace(/"uin/, '{"uin').replace(/,"data/, '}');
        try {
          data = JSON.parse(data);
        } catch (e) {
          logger.debug('QQ空间评论请求参数解析失败');
          callback(e, { code: 103, p: 29 });
          return;
        }
        parameter.uin = data.uin;
        parameter.tid = data.shuoshuo_id;
        this.getQzoneComment(parameter, (error, user) => {
          if (error) {
            error === 'error' ? callback(error, { code: 105, p: 29 }): callback(error, { code: 103, p: 29 });
            return;
          }
          callback(null, user);
        });
      });
      return;
    }
    parameter.uin = uin;
    parameter.tid = tid;
    this.getQzoneComment(parameter, (err, user) => {
      if (err) {
        err === 'error' ? callback(err, { code: 105, p: 29 }): callback(err, { code: 103, p: 29 });
        return;
      }
      callback(null, user);
    });
  }
  getQzoneComment(parameter, callback) {
    const option = {}, user = {};
    let pos = 0,
      contents,
      cycle = true,
      content;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `https://h5.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msgdetail_v6?num=20&uin=${parameter.uin}&tid=${parameter.tid}&pos=${pos}`;
        logger.debug(option.url)
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            cb();
            return;
          }
          try {
            result = eval(result.body);
          } catch (e) {
            logger.debug('QQ空间数据解析失败', result.body);
            cb(e);
            return;
          }
          contents = result.commentlist;
          if (contents.length <= 0) {
            cb('error');
            return;
          }
          for (let i = 0; i < contents.length; i += 1) {
            content = contents[i].content.replace(/\[em\]([\(\^\w\^\)\w])*\[\/em\]/g, '');
            if (parameter.userVal == content.replace(/\s/g, '')) {
              user.p = 29;
              user.id = contents[i].uin;
              user.name = contents[i].name;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          pos += 20;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, result);
      }
    );
  }

  cctv(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).hostname,
      path = URL.parse(htmlUrl, true).pathname,
      index = path.indexOf('.html'),
      vid = path.substring(3, index),
      option = {
        url: htmlUrl
      },
      page = 1,
      contLength = '',
      contents = '',
      endPage = null,
      total = 2,
      sign = 1;
    async.whilst(
      () => sign < total,
      (cb) => {
        option.url = `http://bbs.cntv.cn/api/?module=post&method=getchannelposts&varname=jsonp&channel=xiyou&itemid=video_${vid}&page=${page}&perpage=10&_=${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            return callback(err, { code: 102, p: 30 });
          }

          try {
            result = result.body.replace('var jsonp = ', '').replace(';', '');
            result = JSON.parse(result);
          } catch (e) {
            logger.debug('CCTV数据解析失败');
            return callback(e, { code: 102, p: 30 });
          }
          contents = result.content;
          contLength = contents.length;
          total = result.total;
          if (total % 10 == 0) {
            total /= 10;
          } else {
            total = Math.ceil(total / 10);
          }

          endPage = this.cctvdeal(contLength, userVal, contents, endPage, callback);
          if (endPage) {
            sign = total;
            return cb();
          }
          if (page == total) {
            sign = total;
            return cb();
          }
          page++;
          cb();
        });
      },
      (err, result) => {
        if (!endPage) {
          callback(err, { code: 105, p: 30 });
        }
      }
    );
  }
  cctvdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 30;
        dataJson.id = contents[i].pid;
        dataJson.name = contents[i].uname;
        console.log(`评论内容：${contents[i].content}`);
        console.log(`评论用户Id：${contents[i].pid}`);
        console.log(`评论用户昵称：${contents[i].uname}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  xinlan(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).hostname,
      vid = '',
      option = {
        url: htmlUrl
      },
      sign = 2,
      page = 1,
      contLength = '',
      contents = '',
      endPage = null;

    vid = htmlUrl.match(/vplay\/\d*/).toString().replace(/vplay\//, '');
    async.whilst(
      () => page <= sign,
      (cb) => {
        option.url = `http://proxy.app.cztv.com/getCommentList.do?videoId=${vid}&page=${page}&pageSize=20`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            return callback(err, { code: 102, p: 32 });
          }

          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('新蓝网数据解析失败');
            return callback(e, { code: 102, p: 32 });
          }
          contents = result.content.list;
          contLength = contents.length;
          sign = result.content.comment_count;
          if (sign % 20 == 0) {
            sign /= 20;
          } else {
            sign = Math.ceil(sign / 20);
          }

          endPage = this.xinlandeal(contLength, userVal, contents, endPage, callback);
          page++;
          if (page >= sign) {
            if (!endPage) {
              logger.debug('您输入的值没找到');
              callback(null, { code: 105, p: 32 });
              return cb();
            }
          }
          cb();
        });
      }
    );
  }
  xinlandeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].commentContent.replace(/\s/g, '')) {
        dataJson.p = 32;
        dataJson.id = contents[i].user.userId;
        dataJson.name = contents[i].user.nickName;
        console.log(`评论内容：${contents[i].commentContent}`);
        console.log(`评论用户Id：${contents[i].user.userId}`);
        console.log(`评论用户昵称：${contents[i].user.nickName}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  v1(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).hostname,
      path = URL.parse(htmlUrl, true).pathname,
      vid = path.match(/\d*\./).toString().replace('.', ''),
      option = {},
      page = 0,
      contLength = '',
      contents = '',
      endPage = null,
      total = 2;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `http://dynamic.app.m.v1.cn/www/dynamic.php?mod=mob&ctl=videoComment&act=get&vid=${vid}&p=${page}&pcode=010210000&version=4.5.4`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            return callback(err, { code: 102, p: 33 });
          }

          try {
            result = result.body.replace('var jsonp = ', '').replace(';', '');
            result = JSON.parse(result);
          } catch (e) {
            logger.debug('CCTV数据解析失败');
            return callback(e, { code: 102, p: 33 });
          }
          total = result.body.total;
          if (total % 20 == 0) {
            total /= 20;
          } else {
            total = Math.ceil(total / 20);
          }
          contents = result.body.Comments_list;
          contLength = contents.length;
          endPage = this.v1deal(contLength, userVal, contents, endPage, callback);
          page++;
          if (endPage) {
            page = total + 1;
          }
          cb();
        });
      },
      (err, result) => {
        if (!endPage) {
          return callback(err, { code: 105, p: 33 });
        }
      }
    );
  }
  v1deal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].comments.replace(/\s/g, '')) {
        dataJson.p = 33;
        dataJson.id = contents[i].userId;
        dataJson.name = contents[i].nickname;
        console.log(`评论内容：${contents[i].comments}`);
        console.log(`评论用户Id：${contents[i].userId}`);
        console.log(`评论用户昵称：${contents[i].nickname}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  huashu(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      urlObj = URL.parse(htmlUrl, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      bid = path.match(/id\/\d*/).toString().replace(/id\//, ''),
      name = '',
      option = {
        url: `http://www.wasu.cn/Play/show/id/${bid}`
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('视频详情: ', err);
        return callback(err, { code: 102, p: 35 });
      }
      const $ = cheerio.load(result.body);
      option.url = $('div.play_information_t').eq(0).find(' div.r div.one a').attr('href');
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('专辑信息: ', err);
          return callback(err, { code: 102, p: 35 });
        }

        let $ = cheerio.load(result.body),
          script = $('script')[8].children[0].data,
          bid = script.match(/aggvod\/id\/\d*/).toString().replace('aggvod/id/', '');
        this.getHuashuList(userVal, bid, callback);
      });
    });
  }
  getHuashuList(userVal, bid, callback) {
    const option = {
      url: `http://clientapi.wasu.cn/AggPhone/vodinfo/id/${bid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频列表请求失败', err);
        return callback(err, { code: 103, p: 35 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('视频列表解析失败', e);
        return callback(e, { code: 103, p: 35 });
      }
      const vidInfo = result[1].aggData[0].aggRel;
      this.huashuComment(userVal, vidInfo.video_sid, callback);
    });
  }
  huashuComment(userVal, vid, callback) {
    let option = {
        url: `http://changyan.sohu.com/api/3/topic/liteload?client_id=cyrHNCs04&topic_category_id=37&page_size=10&hot_size=5&topic_source_id=${vid}&_=${new Date().getTime()}`
      },
      page = 1,
      totalPage = 0,
      contents = null,
      length = null,
      endPage = null;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('评论数请求失败', err);
        return callback(err, { code: 103, p: 35 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('评论数解析失败');
        return callback(e, { code: 103, p: 35 });
      }
      const topic_id = result.topic_id;
      if (result.cmt_sum % 10 == 0) {
        totalPage = result.cmt_sum / 10;
      } else {
        totalPage = Math.ceil(result.cmt_sum / 10);
      }
      async.whilst(
        () => page <= totalPage,
        (cb) => {
          option.url = `http://changyan.sohu.com/api/2/topic/comments?client_id=cyrHNCs04&page_size=10&topic_id=${topic_id}&page_no=${page}&_=${new Date().getTime()}`;
          request.get(logger, option, (err, result) => {
            if (err) {
              logger.debug('评论获取失败', err);
              return callback(err, { code: 103, p: 35 });
            }
            try {
              result = JSON.parse(result.body);
            } catch (e) {
              logger.info(result);
              logger.debug('评论解析失败');
              return callback(e, { code: 103, p: 35 });
            }
            contents = result.comments;
            length = contents.length;
            endPage = this.huashudeal(length, userVal, contents, endPage, callback);
            if (endPage) {
              page = totalPage++;
              return callback(null, endPage);
            }
            page++;
            cb();
          });
        },
        (err, result) => {
          if (!endPage) {
            logger.debug('输入的值没找到');
            return callback(null, { code: 105, p: 35 });
          }
        }
      );
    });
  }
  huashudeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 35;
        dataJson.id = contents[i].metadataAsJson.clientPort == undefined ? '' : contents[i].metadataAsJson.clientPort;
        dataJson.name = contents[i].passport.nickname;
        console.log(`评论内容：${contents[i].content}`);
        console.log(`评论用户Id：${contents[i].metadataAsJson.clientPort}`);
        console.log(`评论用户昵称：${contents[i].passport.nickname}`);
        return dataJson;
      }
      endPage = false;
    }
    return endPage;
  }

  youtube(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      urlObj = URL.parse(htmlUrl, true),
      // host    = urlObj.hostname,
      // path    = urlObj.pathname,
      aid = urlObj.query.v,
      bid = '',
      user = {},
      option = {
        url: `https://www.youtube.com/watch?v=${aid}&spf=navigate`,
        proxy: 'http://127.0.0.1:56777',
        method: 'GET',
        headers: {
          // referer: `https://www.youtube.com/channel/${task.bid}`,
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
        return callback(error, { code: 103, p: 39 });
      }
      if (response.statusCode != 200) {
        logger.debug('视频参数状态码错误', response.statusCode);
        return callback(true, { code: 103, p: 39 });
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('解析失败', body);
        return this.youtube(verifyData, callback);
      }
      body = body[3].foot.replace(/[\s\n\r]/g, '');
      user.session_token = body.match(/\'XSRF_TOKEN\':"\w*=+",/).toString().replace(/\'XSRF_TOKEN\':"/, '').replace('",', '');
      user.page_token = body.match(/'COMMENTS_TOKEN':"[\w%]*/).toString().replace(/'COMMENTS_TOKEN':"/, '').replace('",', '');
      user.userVal = userVal;
      user.aid = aid;
      // logger.debug('第一步');
      this.ytbTimeComment(user, (err, users) => {
        if (err) {
          return callback(err, { code: 103, p: 39 });
        }
        callback(null, users);
      });
    });
  }
  ytbTimeComment(user, callback) {
    const option = {
      url: `https://www.youtube.com/watch_fragments_ajax?v=${user.aid}&tr=time&distiller=1&ctoken=${user.page_token}&frags=comments&spf=load`,
      method: 'POST',
      proxy: 'http://127.0.0.1:56777',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        referer: `https://www.youtube.com/watch?v=${user.aid}`,
        cookie: 'PREF=f5=30&fms2=10000&fms1=10000&al=zh-CN&f1=50000000; VISITOR_INFO1_LIVE=G3t2ohxkCtA; YSC=24sBeukc1vk;',
        accept: '*/*'
      },
      formData: {
        session_token: user.session_token
      }
    };
    req(option, (error, response, body) => {
      if (error) {
        logger.debug('youtube评论DOM接口请求失败', error);
        return callback(error);
      }
      if (response.statusCode != 200) {
        logger.debug('评论状态码错误', response.statusCode);
        return callback(true, { code: 103, p: 39 });
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('解析失败', body);
        return callback(e);
      }
      // logger.debug('第二步');
      const $ = cheerio.load(body.body['watch-discussion']);
      user.page_token = $('div.yt-uix-menu.comment-section-sort-menu>div.yt-uix-menu-content>ul>li').eq(1).find('button').attr('data-token').replace(/(253D)/g, '3D');
      this.ytbCommentList(user, (err, users) => {
        callback(null, users);
      });
    });
  }
  ytbCommentList(user, callback) {
    let option = {},
      cycle = true,
      $ = null,
      _$ = null;
    async.whilst(
      () => cycle,
      (cb) => {
        option = {
          url: 'https://www.youtube.com/comment_service_ajax?action_get_comments=1',
          method: 'POST',
          proxy: 'http://127.0.0.1:56777',
          headers: {
            referer: `https://www.youtube.com/watch?v=${user.aid}`,
            cookie: 'PREF=f5=30&fms2=10000&fms1=10000&al=zh-CN&f1=50000000; VISITOR_INFO1_LIVE=G3t2ohxkCtA; YSC=24sBeukc1vk;',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
            'accept-language': 'zh-CN,zh;q=0.8'
          },
          formData: {
            page_token: user.page_token,
            session_token: user.session_token
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
          // logger.debug('第三步');
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
          if ($('.comment-thread-renderer').length <= 0) {
            cycle = false;
            return cb();
          }
          this.ytbdeal(user, $('.comment-thread-renderer'), (err, users) => {
            user.page_token = !_$ ? null : _$('button.yt-uix-button.comment-section-renderer-paginator').attr('data-uix-load-more-post-body').replace('page_token=', '').replace(/253D/g, '3D');
            if (!user.page_token) {
              cycle = false;
            }
            if (users) {
              logger.debug('OK');
              return callback(null, users);
            }
            cb();
          });
        });
      },
      (err, result) => {
        logger.debug('未找到');
        callback(null, { code: 105, p: 39 });
      }
    );
  }
  ytbdeal(task, comments, callback) {
    let length = comments.length,
      index = 0,
      user,
      content,
      comment;
    // logger.debug('最后一步');
    for (index; index < length; index++) {
      comment = comments.eq(index);
      content = comment.find('div.comment-renderer>div.comment-renderer-content div.comment-renderer-text-content').text().replace(/[\s\n\r]/g, '');
      if (task.userVal == content) {
        user = {
          id: comment.find('div.comment-renderer div.comment-renderer-header>a').attr('data-ytid'),
          name: comment.find('div.comment-renderer div.comment-renderer-header>a').text(),
          p: 39
        };
        // logger.debug('匹配成功',user);
        return callback(null, user);
      }
      // logger.debug('匹配失败');
    }
    callback(null, null);
  }
  facebook(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      urlObj = URL.parse(htmlUrl, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      query = urlObj.query,
      bid = '',
      aid = '',
      cycle = true,
      offset = 0,
      option = {
        method: 'POST',
        url: 'https://www.facebook.com/ajax/ufi/comment_fetch.php?dpr=1',
        proxy: 'http://127.0.0.1:56777',
        headers: {
          referer: 'https://www.facebook.com/yitiaotv/videos/vb.374308376088256/641513322701092/?type=3&theater',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
          cookie: 'datr=uarsWNHwHCDMME4QegGkXoHN;locale=zh_CN;'
        },
        formData: {
          // ft_ent_identifier:641513322701092,
          offset: 0,
          length: 50,
          orderingmode: 'recent_activity',
          feed_context: '{"story_width":230,"is_snowlift":true,"fbfeed_context":true}',
          __user: '0',
          __a: '1',
          __dyn: '7AzHK4GgN1t2u6XolwCCwKAKGzEy4S-C11xG3Kq2i5U4e2O2K48hzlyUrxuE99XyEjKewExmt0gKum4UpyEl-9Dxm5Euz8bo5S9J7wHx61YCBxm9geFUpAypk48uwkpo5y16xCWK547ESubz8-',
          lsd: 'AVpZN3FE'
        }
      };
    if (query.type) {
      aid = path.split('/')[4];
    }
    aid = path.split('/')[3];
    option.formData.ft_ent_identifier = aid;
    async.whilst(
      () => cycle,
      (cb) => {
        option.formData.offset = offset;
        req(option, (error, response, body) => {
          if (error) {
            logger.debug('评论列表请求失败', error.message);
            return callback(error, { code: 103, p: 40 });
          }
          if (response.statusCode != 200) {
            logger.debug('评论状态码错误', response.statusCode);
            return callback(true, { code: 103, p: 40 });
          }
          /* logger.debug(option)
           logger.debug(body)*/
          try {
            body = body.replace('for (;;);', '').replace(/[\n\r]/g, '');
            body = JSON.parse(body);
          } catch (e) {
            logger.debug('解析失败', body);
            return cb();
          }
          body = body.jsmods.require[0][3][1];
          if (body.comments.length <= 0) {
            cycle = false;
            return cb();
          }
          this.facedeal(body, userVal, (err, result) => {
            if (err == 'OK') {
              return callback(null, result);
            }
            offset += 50;
            cb();
          });
        });
      },
      (err, result) => {
        logger.debug('结束');
        callback(null, { code: 105, p: 40 });
      }
    );
  }
  facedeal(comments, userVal, callback) {
    const user = {};
    for (let i = 0; i < comments.comments.length; i++) {
      if (comments.comments[i].body.text.replace(/\s/, '') == userVal) {
        user.p = 40;
        user.id = comments.comments[i].author;
        user.name = comments.profiles[user.id].name;
        return callback('OK', user);
      }
    }
    callback();
  }
  renren(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      urlObj = URL.parse(htmlUrl, true),
      hash = urlObj.hash,
      cycle = true,
      page = 1,
      option = {
        url: 'http://web.rr.tv/v3plus/comment/list',
        headers: {
          Referer: 'http://rr.tv/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
          clientType: 'web',
          clientVersion: '0.1.0'
        },
        data: {
          videoId: hash.split('/')[2]
        }
      };
    async.whilst(
      () => cycle,
      (cb) => {
        option.data.page = page;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.debug('评论信息请求失败', err);
            return cb();
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('解析失败', result.body);
            return cb();
          }
          if (result.data.results <= 0) {
            cycle = false;
            return cb();
          }
          this.renrendeal(result.data.results, userVal, (err, result) => {
            if (result) {
              return callback(null, result);
            }
            page++;
            cb();
          });
        });
      },
      (err, result) => {
        logger.debug('结束，信息没找到');
        callback(null, { code: 105, p: 41 });
      }
    );
  }
  renrendeal(commens, userVal, callback) {
    const data = {};
    for (let i = 0; i < commens.length; i++) {
      if (userVal == commens[i].content.replace(/\s/g, '')) {
        data.id = commens[i].author.id;
        data.name = commens[i].author.nickName;
        data.p = 41;
        return callback(null, data);
      }
    }
    callback();
  }
  huoshan(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      vid = htmlUrl.match(/video\/(\d*)/)[1],
      option = {
        ua: 2
      },
      user = {};
    let cycle = true,
      offset = 0;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `https://api.huoshan.com/hotsoon/item/${vid}/comments/?os_version=10.3.1&app_name=live_stream&device_type=iPhone8,2&version_code=2.1.0&count=20&offset=${offset}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('评论信息请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('解析失败', result.body);
            cb();
            return;
          }
          if (result.data.comments.length <= 0) {
            cycle = false;
            cb('error');
            return;
          }
          for (const value of result.data.comments) {
            if (userVal == value.text.replace(/\s/g, '')) {
              user.id = value.user.id;
              user.name = value.user.nickname;
              user.p = 45;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          offset += 20;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err, { code: 105, p: 45 });
          return;
        }
        callback(null, result);
      }
    );
  }
}
module.exports = DealWith;
