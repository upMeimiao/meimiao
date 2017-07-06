/**
 *  update by penghui on 2017/4/28
 * */
const URL = require('url');
const cheerio = require('cheerio');
const request = require('../lib/request');
const async = require('neo-async');
const req = require('request');
const crypto = require('crypto');
const zlib = require('zlib');

const sign = (e) => {
  const md5 = crypto.createHash('md5');
  return md5.update(`700-cJpvjG4g&bad4543751cacf3322ab683576474e31&${e}`).digest('hex');
};
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
    let page = 1, cycle = true, backDate;
    async.whilst(
      () => cycle,
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
            cycle = false;
            cb();
            return;
          }
          for (let i = 0; i < comments.length; i += 1) {
            if (verifyCode === comments[i].content) {
              backDate = {
                p: 1,
                name: comments[i].user.name,
                id: comments[i].user.id,
                encode_id: comments[i].link ?
                  comments[i].link.substring(comments[i].link.lastIndexOf('/') + 1) :
                  comments[i].user.link.match(/u\/([\w=]*)/)[1]
              };
              callback(null, backDate);
              return;
            }
          }
          page += 1;
          cb();
        });
      },
      () => {
        callback(true, { code: 105, p: 1 });
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
        if (error) {
          logger.debug('评论列表返回的错误');
          callback(error, message);
          return;
        }
        callback(null, message);
      });
    });
  }
  iqComment(htmlData, callback) {
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
      },
    cycle = true;
    let page = 1,
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
        option.requests[0].params.page = page;
        dataJson = JSON.stringify(option);
        dataUrl = {
          url: `http://api.t.iqiyi.com/qx_api/framework/all_in_one?albumid=${htmlData.albumid}&cb=fnsucc&data=${dataJson}&is_video_page=true`
        };
        request.get(logger, dataUrl, (error, result) => {
          if (error) {
            logger.error('occur error : ', error);
            cb(error);
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
          if (comments.length === 0) {
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
            if (user) {
              // callback(null, user);
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
  leComment(htmlData, callback) {
    /*
     *  乐视评论列表
     * */
    const option = {};
    let page = 1,
      comments,
      cycle = true,
      parameter;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://api.my.le.com/vcm/api/list?cid=${htmlData.cid}&type=video&rows=20&page=${page}&sort=&source=1&listType=1&xid=${htmlData.vid}&pid=${htmlData.pid}&ctype=cmt%2Cimg%2Cvote`;
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
          if (comments.length === 0) {
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
            page += 1;
            cb();
          });
        });
      },
      (err, result) => {
        if (err) {
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
    callback(null, null);
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
      const $ = cheerio.load(data.body),
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
  txCommentId(parameter, callback) {
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
        logger.info('json error: ', result.body);
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
  txCommentList(parameter, callback) {
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
          for (let i = 0; i < comments.length; i += 1) {
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
          err === 'error' ? callback(err, { code: 105, p: 4 }) : callback(err, { code: 103, p: 4 });
          return;
        }
        callback(null, result);
      }
    );
  }
  meipai(verifyData, callback) {
    const urlId = verifyData.remote.match(/media\/\d*/).toString().replace(/media\//, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, '');
    let cycle = true,
      page = 1;
    async.whilst(
      () => cycle,
      (cb) => {
        const options = {
          url: `http://www.meipai.com/medias/comments_timeline?page=${page}&count=10&id=${urlId}`
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
          if (result.length === 0) {
            cb('error');
            return;
          }
          this.mpdeal(userVal, result, (error, user) => {
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
          err === 'error' ? callback(err, { code: 105, p: 5 }) : callback(err, { code: 103, p: 5 });
          return;
        }
        callback(null, result);
      }
    );
  }
  mpdeal(userVal, contents, callback) {
    const user = {};
    for (let i = 0; i < contents.length; i += 1) {
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
    let cycle = true,
      comments,
      groupid = '',
      offset = 0;
    if (host === 'www.365yg.com' || host === 'm.365yg.com') {
      groupid = htmlUrl.match(/group\/(\d*)/) ? htmlUrl.match(/group\/(\d*)/)[1] : '';
      groupid = groupid || (htmlUrl.match(/item\/(\d*)/) ? htmlUrl.match(/item\/(\d*)/)[1] : htmlUrl.match(/\/i(\d*)/)[1]);
    } else {
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
          if (comments.length === 0) {
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
            cb();
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
    for (let i = 0; i < comments.length; i += 1) {
      if (userVal == comments[i].comment.text.replace(/\s/g, '')) {
        user.p = 6;
        user.id = comments[i].comment.user_id;
        user.name = comments[i].comment.user_name;
        callback(null, user);
        return;
      }
    }
    callback(null, null);
  }
  miaopai(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      scid = htmlUrl.match(/show\/([\w | ~ | \d | -]*)/)[1],
      option = {
        url: htmlUrl
      };
    let $, oli, liLength, cycle = true, page = 0;
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
        if (result) { callback(null, result); return; }
        callback(true, { code: 105, p: 7 });
      }
    );
  }
  miaopaiComment(parameter, callback) {
    const user = {};
    let content, suidUrl, _nick, $, uid, index = 0;
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
        content = content.replace(/回复/, '').replace(/\s/g, '');
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
              cb('e');
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
        if (err) {
          callback(err);
          return;
        }
        if (result) {
          callback(null, result);
          return;
        }
        callback();
      }
    );
  }
  bili(verifyData, callback) {
    const verifyCode = verifyData.verifyCode.replace(/\s/g, ''),
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
          for (let i = 0; i < replies.length; i += 1) {
            if (verifyCode == replies[i].content.message.replace(/\s/g, '')) {
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
        if (result) {
          callback(null, result);
        } else {
          callback(true, { code: 105, p: 8 });
        }
      }
    );
  }
  sohu(verifyData, callback) {
    /*
     *  通过获取到的视频ID获取topic_id
     * */
    const verifyCode = verifyData.verifyCode.replace(/\s/g, ''),
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
      data = data.body.replace(/[\s\n\r]/g, '');
      const vid = data.match(/varvid=\'([\d]*)/)[1] || data.match(/vid:\'([\d]*)/)[1],
        loadUrl = {
          url: `http://changyan.sohu.com/api/2/topic/load?client_id=cyqyBluaj&tvsubject_need=true&topic_url=${htmlUrl}&topic_source_id=bk${vid}&page_size=10&elite_size=0&elite_no=1&hot_size=0&_=${new Date().getTime()}`
        };
      this.souhuTopicId(loadUrl, verifyCode, (error, user) => {
        if (error) {
          callback(error, { code: 105, p: 9 });
          return;
        }
        if (user) {
          callback(null, user);
        } else {
          callback(true, { code: 105, p: 9 });
        }
      });
    });
  }
  souhuTopicId(loadUrl, verifyCode, callback) {
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
        if (user) {
          callback(null, user);
        } else {
          callback(null, null);
        }
      });
    });
  }
  souhuComent(parameter, callback) {
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
          for (let i = 0; i < comments.length; i += 1) {
            if (parameter.verifyCode == comments[i].content.replace(/\s/g, '')) {
              user.p = 9;
              user.id = comments[i].passport.user_id;
              user.name = comments[i].passport.nickname;
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
        if (result) {
          callback(null, result);
        } else {
          callback(null, null);
        }
      }
    );
  }
  kuaibao(verifyData, callback) {
    /*
     *  获取评论ID commentId
     * */
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      options = {
        url: htmlUrl
      };
    let commentid = htmlUrl.match(/commentid=([\d]*)/);
    if (!commentid) {
      request.get(logger, options, (err, result) => {
        if (err) {
          logger.debug('评论ID请求失败');
          callback(err, { code: 103, p: 10 });
          return;
        }
        result = result.body.replace(/[\s\n\r]/g, '');
        commentid = result.match(/varcommentId=\"(\d*)/)[1];
        this.kbComment(userVal, commentid, (error, user) => {
          if (error) {
            error === 'error' ? callback(error, { code: 105, p: 10 }) : callback(error, { code: 103, p: 10 });
            return;
          }
          callback(null, user);
        });
      });
      return;
    }
    commentid = commentid[1];
    this.kbComment(userVal, commentid, (err, user) => {
      if (err) {
        err === 'error' ? callback(err, { code: 105, p: 10 }) : callback(err, { code: 103, p: 10 });
        return;
      }
      callback(null, user);
    });
  }
  kbComment(userVal, commentid, callback) {
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
        if (err) {
          callback(err);
          return;
        }
        callback(null, result);
      }
    );
  }
  kbdeal(userVal, contents, callback) {
    const user = {};
    for (let i = 0; i < contents.length; i += 1) {
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
  tudou(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      path = URL.parse(htmlUrl, true).pathname,
      vid = path.split('/')[2],
      option = {},
      user = {};
    let cycle = true,
      page = 1,
      contents,
      time;
    async.whilst(
      () => cycle,
      (cb) => {
        time = parseInt(new Date().getTime() / 1000, 10);
        option.url = `http://p.comments.youku.com/ycp/comment/pc/commentList?app=700-cJpvjG4g&objectId=${vid}&objectType=1&listType=0&currentPage=${page}&pageSize=30&sign=${sign(time)}&time=${time}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('土豆json数据解析失败', result.body);
            cb();
            return;
          }
          contents = result.data.comment;
          if (contents.length === 0) {
            cycle = false;
            cb('error');
            return;
          }
          for (let i = 0; i < contents.length; i += 1) {
            if (userVal == contents[i].content.replace(/\s/g, '')) {
              user.p = 12;
              user.id = contents[i].user.userId;
              user.name = contents[i].user.userName;
              user.encode_id = contents[i].user.userCode;
              cycle = false;
              cb(null, user);
              return;
            }
          }
          page += 1;
          cb();
        });
      },
      (error, result) => {
        if (error) {
          error === 'error' ? callback(error, { code: 105, p: 12 }) : callback(error, { code: 103, p: 12 });
          return;
        }
        callback(null, result);
      }
    );
  }
  baomihua(verifyData, callback) {
    const htmlUrl = verifyData.remote,
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
      const $ = cheerio.load(htmlData.body),
        script = $('script')[0].children[0].data,
        flvid = script.match(/var flvid = (\d*)/)[1];
      if (!flvid) {
        logger.debug('爆米花请求的源码结构发生改变');
        callback('e', { code: 103, p: 13 });
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
  bmComment(userVal, flvid, callback) {
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
            data = JSON.parse(data.body.replace(/[\n\\]/g, ''));
          } catch (e) {
            logger.error('爆米花json数据解析失败');
            logger.info(data);
            cb(e);
            return;
          }
          contents = data.result.item;
          if (!beginCid) {
            beginCid = contents[0].reviewID;
          }
          if (beginCid == contents[0].reviewID) {
            logger.debug('当前评论翻页失效');
            callback('NO', { code: 103, p: 13 });
            return;
          }
          if (contents.length === 0) {
            cb('error');
            return;
          }
          for (let i = 0; i < contents.length; i += 1) {
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
          for (const key in contents) {
            if (userVal == contents[key].commentContent.replace(/\s/g, '')) {
              user.p = 14;
              user.id = contents[key].commentAuthorId;
              user.name = contents[key].commentAuthor || contents[key].partner.p_username;
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
  btComment(verifyCode, itemkey, callback) {
    const dataUrl = {},
      user = {};
    let cycle = true,
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
          for (let i = 0; i < contents.length; i += 1) {
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
      this.xyComment(parameter, (err, user) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 17 }) : callback(err, { code: 105, p: 17 });
          return;
        }
        callback(null, user);
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
          for (let i = 0; i < comments.length; i += 1) {
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
          for (let i = 0; i < contents.length; i += 1) {
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
          for (let i = 0; i < comments.length; i += 1) {
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
    const htmlUrl = URL.parse(verifyData.remote, true),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = htmlUrl.hostname,
      path = htmlUrl.pathname,
      option = {
        url: verifyData.remote
      };
    let vid = null;
    if (host == 'www.56.com' || host == 'm.56.com') {
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          callback(err, { code: 103, p: 21 });
          return;
        }
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
    let page = 1, contents,
      total = num % 30 === 0 ? num / 30 : Math.ceil(num / 30);;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.url = `http://changyan.sohu.com/api/2/topic/comments?client_id=cyqyBluaj&page_size=30&topic_id=${vid}&page_no=${page}&_=${new Date().getTime()}`;
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
              total = 0;
              callback(null, user);
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
        } else if (result) {
          callback(null, result);
        } else {
          callback('error');
        }
      }
    );
  }
  acfun(verifyData, callback) {
    const verifyCode = verifyData.verifyCode.replace(/\s/, ''),
      htmlUrl = verifyData.remote,
      contentId = htmlUrl.match(/\/ac[\d]*/).toString().replace('/ac', ''),
      user = {},
      options = {};
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
    let vid;
    if (htmlUrl.match(/video_(\d*)/)) {
      vid = htmlUrl.match(/video_(\d*)/)[1];
    } else {
      vid = htmlUrl.match(/video\/(\d*)/)[1];
    }
    option.url = `http://v.ifeng.com/docvlist/${vid}-1.js`;
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err, { code: 103, p: 24 });
        return;
      }
      result = result.body;
      if (!result || result.length <= 0 || result.match(/404.shtml/)) {
        callback('err', { code: 103, p: 24 });
        return;
      }
      const startIndex = result.indexOf('var data='),
        endIndex = result.indexOf(';bsCallback.getSinglePage');
      if ((startIndex || endIndex) === -1) {
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
      this.ifengComment(data.dataList[0].guid, userVal, (error, user) => {
        if (error) {
          callback(error, { code: 105, p: 24 });
          return;
        }
        callback(null, user);
      });
    });
  }

  ifengComment(cid, userVal, callback) {
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
    vid = vid.substring(0, 1) === 'V' ? vid.replace('V', '') : vid;
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
          const comments = result.comments;
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
        callback(err, result);
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
        const $ = cheerio.load(result.body);
        let script;
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
  getUClist(parameter, callback) {
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
    const htmlUrl = verifyData.remote,
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
        const $ = cheerio.load(result.body),
          script = $('script')[13].children[0].data;
        let data = script.match(/"uin":"\d*","_wv":"\d*","_ws":"\d*","adtag":"\w*","is_video":"\w*","shuoshuo_id":"\w*","data/).toString().replace(/"uin/, '{"uin').replace(/,"data/, '}');
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
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      path = URL.parse(htmlUrl, true).pathname,
      index = path.indexOf('.html'),
      vid = path.substring(3, index),
      option = {
        url: htmlUrl,
        ua: 1
      },
      user = {};
    let page = 1,
      contents = '',
      cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://bbs.cntv.cn/api/?module=post&method=getchannelposts&channel=xiyou&itemid=video_${vid}&page=${page}&perpage=10&_=${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('CCTV数据解析失败', result.body);
            cb(e);
            return;
          }
          contents = result.content;
          if (!contents || !contents.length) {
            cb('error');
            return;
          }
          for (const value of contents) {
            if (userVal == value.content.replace(/\s/g, '')) {
              user.p = 30;
              user.id = value.uid;
              user.name = value.uname;
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
          err === 'error' ? callback(err, { code: 105, p: 30 }) : callback(err, { code: 103, p: 30 });
          return;
        }
        callback(null, result);
      }
    );
  }
  xinlan(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      option = {
        url: htmlUrl,
        ua: 1
      },
      user = {},
      vid = htmlUrl.match(/vplay\/(\d*)/)[1];
    let page = 1,
      contents = '',
      cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://api.my.cztv.com/api/list?xid=${vid}&pid=211&type=video&page=${page}&rows=10&_=${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('新蓝网数据解析失败');
            cb(e);
            return;
          }
          contents = result.data;
          if (!contents || !contents.length) {
            cb('error');
            return;
          }
          for (const value of contents) {
            if (userVal == value.content.replace(/\s/g, '')) {
              user.p = 32;
              user.id = value.user.uid;
              user.name = value.user.username;
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
          err === 'error' ? callback(err, { code: 105, p: 30 }) : callback(err, { code: 103, p: 30 });
          return;
        }
        callback(null, result);
      }
    );
  }
  v1(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      path = URL.parse(htmlUrl, true).pathname,
      vid = path.match(/(\d*)\./)[1],
      option = {
        url: 'http://www.v1.cn/comment/getList4Ajax',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        },
        data: {
          vid
        }
      };
    let lastid = 0,
      contents = '',
      cycle = true,
      user;
    async.whilst(
      () => cycle,
      (cb) => {
        option.data.last_id = lastid;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('第一视频数据解析失败');
            cb(e);
            return;
          }
          if (result.msg != 1 || !result.list) {
            cb('error');
            return;
          }
          contents = result.list;
          for (const value of contents) {
            if (userVal == value.content.replace(/\s/g, '')) {
              user = {
                id: value.userid,
                name: value.nickname,
                p: 33
              };
              cycle = false;
              cb(null, user);
              return;
            }
            lastid = value.comment_id;
          }
          cb();
        });
      },
      (err, result) => {
        if (err) {
          err === 'error' ? callback(err, { code: 105, p: 30 }) : callback(err, { code: 103, p: 30 });
          return;
        }
        callback(null, result);
      }
    );
  }

  youtube(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      urlObj = URL.parse(htmlUrl, true),
      aid = urlObj.query.v,
      user = {},
      option = {
        url: `https://www.youtube.com/watch?v=${aid}&spf=navigate`,
        proxy: 'http://127.0.0.1:56777',
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
          'accept-language': 'zh-CN,zh;q=0.8',
          cookie: 'PREF=f5=30&fms2=10000&fms1=10000&al=zh-CN&f1=50000000; VISITOR_INFO1_LIVE=G3t2ohxkCtA; YSC=24sBeukc1vk;'
        }
      };
    req(option, (error, response, body) => {
      if (error) {
        logger.debug('youtube的视频参数接口请求失败', error);
        callback(error, { code: 103, p: 39 });
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('解析失败', body);
        this.youtube(verifyData, callback);
        return;
      }
      body = body[3].foot.replace(/[\s\n\r]/g, '');
      user.session_token = body.match(/\'XSRF_TOKEN\':"\w*=+",/).toString().replace(/\'XSRF_TOKEN\':"/, '').replace('",', '');
      user.page_token = body.match(/'COMMENTS_TOKEN':"[\w%]*/).toString().replace(/'COMMENTS_TOKEN':"/, '').replace('",', '');
      user.userVal = userVal;
      user.aid = aid;
      this.ytbTimeComment(user, (err, users) => {
        if (err) {
          callback(err, { code: 103, p: 39 });
          return;
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
        callback(error);
        return;
      }
      if (response.statusCode !== 200) {
        logger.debug('评论状态码错误', response.statusCode);
        callback(true, { code: 103, p: 39 });
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('解析失败', body);
        callback(e);
        return;
      }
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
            logger.debug('youtube评论列表请求失败', error);
            cb();
            return;
          }
          if (response.statusCode !== 200) {
            logger.debug(option);
            logger.debug('评论列表状态码错误', response.statusCode);
            cb();
            return;
          }
          try {
            body = JSON.parse(body);
          } catch (e) {
            logger.debug('评论列表数据解析失败', body);
            cb();
            return;
          }
          if (!body.content_html) {
            cycle = false;
            cb();
            return;
          }
          $ = cheerio.load(body.content_html);
          if (body.load_more_widget_html) {
            _$ = cheerio.load(body.load_more_widget_html);
          } else {
            _$ = null;
          }
          if ($('.comment-thread-renderer').length <= 0) {
            cycle = false;
            cb();
            return;
          }
          this.ytbdeal(user, $('.comment-thread-renderer'), (err, users) => {
            user.page_token = !_$ ? null : _$('button.yt-uix-button.comment-section-renderer-paginator').attr('data-uix-load-more-post-body').replace('page_token=', '').replace(/253D/g, '3D');
            if (!user.page_token) {
              cycle = false;
            }
            if (users) {
              logger.debug('OK');
              callback(null, users);
              return;
            }
            cb();
          });
        });
      },
      () => {
        logger.debug('未找到');
        callback(null, { code: 105, p: 39 });
      }
    );
  }
  ytbdeal(task, comments, callback) {
    const length = comments.length;
    let index = 0,
      user,
      content,
      comment;
    // logger.debug('最后一步');
    for (index; index < length; index += 1) {
      comment = comments.eq(index);
      content = comment.find('div.comment-renderer>div.comment-renderer-content div.comment-renderer-text-content').text().replace(/[\s\n\r]/g, '');
      if (task.userVal == content) {
        user = {
          id: comment.find('div.comment-renderer div.comment-renderer-header>a').attr('data-ytid'),
          name: comment.find('div.comment-renderer div.comment-renderer-header>a').text(),
          p: 39
        };
        callback(null, user);
        return;
      }
    }
    callback(null, null);
  }
  facebook(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      urlObj = URL.parse(htmlUrl, true),
      path = urlObj.pathname,
      query = urlObj.query,
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
    let cycle = true,
      offset = 0,
      aid = '';
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
            callback(error, { code: 103, p: 40 });
            return;
          }
          if (response.statusCode !== 200) {
            logger.debug('评论状态码错误', response.statusCode);
            callback(true, { code: 103, p: 40 });
            return;
          }
          try {
            body = body.replace('for (;;);', '').replace(/[\n\r]/g, '');
            body = JSON.parse(body);
          } catch (e) {
            logger.debug('解析失败', body);
            cb();
            return;
          }
          body = body.jsmods.require[0][3][1];
          if (body.comments.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          this.facedeal(body, userVal, (err, result) => {
            if (err === 'OK') {
              callback(null, result);
              return;
            }
            offset += 50;
            cb();
          });
        });
      },
      () => {
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
        callback('OK', user);
        return;
      }
    }
    callback();
  }
  renren(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      urlObj = URL.parse(htmlUrl, true),
      hash = urlObj.hash,
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
    let cycle = true,
      page = 1;
    async.whilst(
      () => cycle,
      (cb) => {
        option.data.page = page;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.debug('评论信息请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('解析失败', result.body);
            cb();
            return;
          }
          if (result.data.results <= 0) {
            cycle = false;
            cb();
            return;
          }
          this.renrendeal(result.data.results, userVal, (error, res) => {
            if (res) {
              callback(null, res);
              return;
            }
            page += 1;
            cb();
          });
        });
      },
      () => {
        logger.debug('结束，信息没找到');
        callback(null, { code: 105, p: 41 });
      }
    );
  }
  renrendeal(commens, userVal, callback) {
    const data = {};
    for (let i = 0; i < commens.length; i += 1) {
      if (userVal == commens[i].content.replace(/\s/g, '')) {
        data.id = commens[i].author.id;
        data.name = commens[i].author.nickName;
        data.p = 41;
        callback(null, data);
        return;
      }
    }
    callback();
  }
  gumi(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      vid = htmlUrl.match(/(\d*)\.html/)[1],
      option = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest'
        }
      };
    let cycle = true,
      index = 1,
      user;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://www.migudm.cn/ugc/${vid}/commentList_p${index}.html`;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.error('咕咪动漫评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('咕咪动漫评论列表解析失败', e);
            cb();
            return;
          }
          if (result.data.comments.length === 0) {
            cb('error');
            return;
          }
          for (const [key, value] of result.data.comments.entries()) {
            if (userVal == value.content.replace(/\s/g, '')) {
              user = {
                id: value.userId,
                name: value.nickName,
                p: 46
              };
              cycle = false;
              cb(null, user);
              return;
            }
          }
          index += 1;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err, { code: 105, p: 46 });
          return;
        }
        callback(null, result);
      }
    );
  }
  douyin(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      vid = htmlUrl.match(/\/video\/(\d*)/)[1],
      option = {
        headers: {
          'user-agent': 'Aweme/1.4.6 (iPhone; iOS 10.3.2; Scale/3.00)'
        }
      };
    let cycle = true,
      cursor = 0,
      user;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `https://aweme.snssdk.com/aweme/v1/comment/list/?app_name=aweme&aweme_id=${vid}&count=20&cursor=${cursor}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('抖音评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('抖音评论列表解析失败', e);
            cb();
            return;
          }
          if (!result.comments || !result.comments.length) {
            cb('error');
            return;
          }
          for (const [key, value] of result.comments.entries()) {
            if (userVal == value.text.replace(/\s/g, '')) {
              user = {
                id: value.user.uid,
                name: value.user.nickname,
                p: 47
              };
              cycle = false;
              cb(null, user);
              return;
            }
          }
          cursor += 20;
          cb();
        });
      },
      (err, result) => {
        if (err) {
          callback(err, { code: 105, p: 47 });
          return;
        }
        callback(null, result);
      }
    );
  }
  aipai(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      host = URL.parse(htmlUrl, true).hostname,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      option = {
        url: htmlUrl,
        headers: {
          'user-agent': 'Aipai/342 (iPhone; iOS 10.3.2; Scale/3.0) aipai/iOS/aipai/aipai/v(342)'
        }
      };
    let vid = null;
    if (host === 'www.aipai.com') {
      option.url = htmlUrl.replace('http://www.aipai.com/c', 'http://m.aipai.com/m');
    }
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('视频详情请求失败', err);
        callback(err, { code: 103, p: 48 });
        return;
      }
      result = result.body.replace(/[\s\r\n]/g, '');
      vid = result.match(/asset_id="(\d*)/);
      if (!vid) {
        logger.error('DOM数据可能有问题');
        callback('err', { code: 103, p: 48 });
        return;
      }
      this.aipaiComment(userVal, vid[1], (error, user) => {
        if (error) {
          callback(error, { code: 105, p: 48 });
          return;
        }
        callback(null, user);
      });
    });
  }
  aipaiComment(userVal, vid, callback) {
    const option = {
      ua: 3,
      own_ua: 'Aipai/342 (iPhone; iOS 10.3.2; Scale/3.0) aipai/iOS/aipai/aipai/v(342)'
    };
    let cycle = true,
      page = 1,
      user;
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `http://www.aipai.com/api/aipaiApp_action-getCommentNew_page-${page}_spread-0_mobile-1_appver-i3.6.1_type-2_cid-${vid}.html`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('抖音评论列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('抖音评论列表解析失败', e);
            cb();
            return;
          }
          if (!result.list || !result.list.length) {
            cb('error');
            return;
          }
          for (const value of result.list) {
            if (userVal == value.comment.replace(/\s/g, '')) {
              user = {
                id: value.bid,
                name: value.nick,
                p: 48
              };
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
  xiaokaxiu(verifyData, callback) {
    const htmlUrl = verifyData.remote,
      host = URL.parse(htmlUrl, true).hostname,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      option = {
        url: htmlUrl,
        headers: {
          'user-agent': 'Aipai/342 (iPhone; iOS 10.3.2; Scale/3.0) aipai/iOS/aipai/aipai/v(342)'
        }
      };
    let vid = null;
    if (host === 'v.xiaokaxiu.com') {
      option.url = htmlUrl.replace('https://v.xiaokaxiu.com/v', 'https://m.xiaokaxiu.com/m');
    }
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('视频详情请求失败', err);
        callback(err, { code: 103, p: 49 });
        return;
      }
      const $ = cheerio.load(result.body);
      vid = $('div.sp a').attr('class').match(/btnOpenApp(\d*)/);
      if (!vid) {
        logger.error('DOM数据可能有问题');
        callback('err', { code: 103, p: 49 });
        return;
      }
      this.xiaokaxiuComment(userVal, vid[1], (error, user) => {
        if (error) {
          callback(error, { code: 105, p: 49 });
          return;
        }
        callback(null, user);
      });
    });
  }
  xiaokaxiuComment(userVal, vid, callback) {
    const option = {
      url: 'https://api.xiaokaxiu.com/comment/api/get_comments',
      encoding: 1,
      headers: {
        'User-Agent': 'YXCaptureApp/1.7.6 (iPhone; iOS 10.3.2; Scale/3.00)',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: {
        _secdata: 'fCuZ0_Ms-qbyC4qqBOeeoMQy8R5R2hUJvIVd6fWGz0nLP1Pv2ohw19C6xI6dSjkapKvrMNoEDkqaSe3_Vhg2WvCrtCSjqLaW_Y5uP8vqFNR4iTaKSaSH5k7m8AVpQrckFxDVyYyLKrHmwFr06TXTQ_5TJi55BBf_1nc8avzmZTrE-3s9AkP5y8JmownDLlE6wSzczGa3s_qFV_H36O5cX29ij5AVtfFkqfszFzuF2p86w8G9eXondEFTldsc17YBISXniJR1k6v8f6PtiV2xrMpZV6DGzfuYVmPnp6ouEuZoWZ3Mz2Lqd2qHCRcAHjmKbBfraMvpEskjcc7aB_cPrVWqUScztHKtQ3EywufXxPu2dQ4thBArQ3-loiShxdhkkwRJb-ErTpLxC2UF_bDIbFlhShNZxL6_dL42tJr28pf2Ovutg0pELRhNmae-_kasBPqhbbgEaAmy2mcdiKrlrA..',
        limit: 20,
        page: 1,
        videoid: vid
      }
    };
    let page = 1,
      cycle = true,
      user;
    async.whilst(
      () => cycle,
      (cb) => {
        option.data.page = page;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.error('列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(zlib.unzipSync(result.body).toString());
          } catch (e) {
            logger.error('列表请求失败', result.body);
            cb();
            return;
          }
          if (!result.data || !result.data.list || !result.data.list.length) {
            cycle = false;
            cb('error');
            return;
          }
          result.data.list = result.data.list.concat(result.data.hotlist);
          for (const value of result.data.list) {
            // logger.debug(value);
            if (userVal == value.content.replace(/\s/, '')) {
              user = {
                id: value.memberid,
                name: value.nickname,
                p: 49
              };
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
        callback(err, result);
      }
    );
  }
}
module.exports = DealWith;
