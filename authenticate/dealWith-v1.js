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
                  return setTimeout(() => {
                    cb();
                  }, 100);
                }
                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.error('优酷json数据解析失败');
                  logger.info('json error: ', result);
                  return setTimeout(() => {
                    cb();
                  }, 100);
                }
                const comments = result.comments;
                if (comments.length === 0) {
                  sign = false;
                  return cb();
                }
                for (let i = 0; i < comments.length; i += 1) {
                  if (verifyCode === comments[i].content) {
                    backDate = {
                      p: 1,
                      name: comments[i].user.name,
                      id: comments[i].user.id,
                      encode_id: comments[i].link.substring(comments[i].link.lastIndexOf('/') + 1)
                    };
                    sign = false;
                    return cb();
                  }
                }
                page += 1;
                return cb();
              });
            },
            (err) => {
              if (err || !backDate) {
                return callback('error', { code: 101, p: 1 });
              }
              return callback(null, backDate);
            }
        );
  }
  iqiyi(verifyData, callback) {
    // 输入的地址
    // 输入的评论值
    // 初始化一个对象
    const htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      htmlData = {},
      options = {
        url: htmlUrl
      };
        // request.get请求中options需要以对象的形式传参
    request.get(logger, options, (err, domData) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err, { code: 102, p: 2 });
        return;
      }
      // 请求返回的html数据
      // 摘取出来第七个script标签
      const $ = cheerio.load(domData.body),
        script = $('script')[6].children[0].data;
      // 获取到albuId
      // 获取视频Id
      const albumId = script.match(/albumId:\d*/).toString().replace('albumId:', '');
      const tvId = script.match(/tvId:\d*/).toString().replace('tvId:', '');
      htmlData.albumId = albumId;
      htmlData.tvId = tvId;
      // 当前页数
      // 总共的页数
      let sign = 1,
        page = 2;
      async.whilst(
        () =>
            // 条件判断
             sign < page,
        (cb) => {
            // 请求评论信息的url参数
          const option = {
            requests: [
              {
                uri: '/comment/get_video_comments',
                params: {
                  page_size: 10,
                  page: sign,
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
          // 设置当前页
          // 转换成json字符串格式传递
          // 请求api的路径
          option.requests[0].params.page = sign;
          const dataJson = JSON.stringify(option),
            dataUrl = {
              url: `http://api.t.iqiyi.com/qx_api/framework/all_in_one?albumid=${htmlData.albumid}&cb=fnsucc&data=${dataJson}&is_video_page=true`
            };
          request.get(logger, dataUrl, (error, data) => {
            if (error) {
              logger.error('occur error : ', error);
              callback(err, { code: 102, p: 2 });
              return;
            }
            try {
              // 把返回来的json字符串转换成json对象
              data = JSON.parse(data.body);
            } catch (e) {
              logger.error('爱奇艺json数据解析失败');
              logger.info(data);
              callback(e, { code: 102, p: 2 });
              return;
            }

            const contents = data.data.$comment$get_video_comments.data.comments;
            const contLength = contents.length;
            // true为匹配到值，false为没有匹配到
            // 每一页的下标索引值
            let endPage = null;// contsNum = 0;
            endPage = this.iqdeal(contLength, userVal, contents, endPage, callback);
            if (contLength < 10) {
              page = sign;
              if (!endPage) {
                console.log('您输入的值没找到');
              }
              cb();
              return;
            }
            if (endPage) {
              sign += 1;
              page = sign;
              cb();
              return;
            }
            sign += 1;
            page += 1;
            cb();
          });
        }
      );
    });
  }
  iqdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i += 1) {
      if (userVal === contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 2;
        dataJson.id = contents[i].userInfo.uid;
        dataJson.name = contents[i].userInfo.uname;
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  le(verifyData, callback) {
        // 输入的地址
        // 输入的评论值
        // 初始化一个对象
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      htmlData = {},
      options = {
        url: htmlUrl
      };

    request.get(logger, options, (err, data) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 3 });
      }

      let $ = cheerio.load(data.body),
        script = $('script')[0].children[0].data;
      if (script == undefined) {
        logger.debug('乐视请求的源码结构发生改变');
        return callback(e, { code: 102, p: 3 });
      }
      let cid = script.match(/cid: \d*/).toString().replace('cid: ', ''),
        pid = script.match(/pid: \d*/).toString().replace('pid: ', ''),
        vid = script.match(/vid: \d*/).toString().replace('vid: ', '');
      htmlData.cid = cid;
      htmlData.pid = pid;
            // 视频Id
      htmlData.vid = vid;

            // 当前页数
            // 总共的页数
      let sign = 1,
        page = 2;
      async.whilst(
                () => sign < page,
                (cb) => {
                    // api请求路径
                  const dataurl = {
                    url: `http://api.my.le.com/vcm/api/list?cid=${htmlData.cid}&type=video&rows=20&page=${sign}&sort=&source=1&listType=1&xid=${htmlData.vid}&pid=${htmlData.pid}&ctype=cmt%2Cimg%2Cvote`
                  };

                  request.get(logger, dataurl, (err, objdata) => {
                    if (err) {
                      logger.error('occur error : ', err);
                      return callback(err, { code: 102, p: 3 });
                    }

                    try {
                            // 把返回来的json字符串转换成json对象
                      objdata = JSON.parse(objdata.body);
                    } catch (e) {
                      logger.error('乐视json数据解析失败');
                      logger.info(objdata);
                      return callback(e, { code: 102, p: 3 });
                    }
                    let contents = objdata.data,
                      contNum = 0,
                      endPage = null,
                      contLength = contents.length;

                    endPage = this.ledeal(contLength, userVal, contents, endPage, callback);
                    if (contLength < 10) {
                      page = sign;
                      if (!endPage) {
                        console.log('您输入的值没找到');
                      }
                      return cb();
                    }
                    if (endPage) {
                      sign++;
                      page = sign;
                      return cb();
                    }
                    sign++;
                    page++;
                    return cb();
                  });
                }
            );
    });
  }
  tencent(verifyData, callback) {
    const verifyCode = verifyData.verifyCode;
    let htmlUrl = verifyData.remote,
      dataJson = {},
      page = 1,
      pageCount = 2,
      commentid = '', // commentid  每次访问会生成一个新的参数，同坐这个参数可以直接在循环下一页的数据
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, data) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 4 });
      }

      let $ = cheerio.load(data.body),
        script = $('script')[3].children[0].data,
                // 找正则匹配vid
        vid = script.match(/vid: \"[\w\d]*/).toString().replace(/vid: \"/, '');
      const option = {
        url: `https://ncgi.video.qq.com/fcgi-bin/video_comment_id?otype=json&op=3&vid=${vid}`
      };
      request.get(logger, option, (err, data) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 4 });
        }

        try {
          data = JSON.parse(data.body.replace(/QZOutputJson=/, '').replace(/;/, ''));
        } catch (e) {
          logger.error('腾讯json数据解析失败');
          logger.info('json error: ', data);
          return callback(e, { code: 102, p: 4 });
        }
        const comment_id = data.comment_id;
        async.whilst(
                        () => page <= pageCount,
                        (cb) => {
                          const infoUrl = {
                            url: `https://coral.qq.com/article/${comment_id}/comment?reqnum=10&commentid=${commentid}`
                          };
                          request.get(logger, infoUrl, (err, data) => {
                            if (err) {
                              logger.error('occur error : ', err);
                              return callback(err, { code: 102, p: 4 });
                            }

                            try {
                              data = JSON.parse(data.body);
                            } catch (e) {
                              logger.error('腾讯json数据解析失败');
                              logger.info('json error: ', data);
                              return callback(e, { code: 102, p: 4 });
                            }
                            let commentids = data.data.commentid,
                              total = data.data.total;

                            if (total % 10 == 0) {
                              pageCount = total / 10;
                            } else {
                              pageCount = Math.ceil(total / 10);
                            }
                            for (let i = 0; i < commentids.length; i++) {
                              if (verifyCode == commentids[i].content) {
                                dataJson.p = 4;
                                dataJson.id = commentids[i].userinfo.userid;
                                dataJson.name = commentids[i].userinfo.nick;
                                page = pageCount + 10;
                                logger.debug('找到了');
                                        // logger.debug(dataJson)
                                return callback(null, dataJson);
                              }
                            }
                            page++;
                            commentid = data.data.last;
                            cb();
                          });
                        },
                        (err) => {
                          if (err) {
                            return callback(err);
                          }
                          return logger.debug('没找到');
                        }
                    );
      });
    });
        // })
  }
  meipai(verifyData, callback) {
    let urlId = verifyData.remote.match(/media\/\d*/).toString().replace(/media\//, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      sign = 1,
      page = 3;

    async.whilst(
            () => sign < page,
            (cb) => {
              const options = {
                url: `http://www.meipai.com/medias/comments_timeline?page=${sign}&count=10&id=${urlId}`
              };
              request.get(logger, options, (err, data) => {
                if (err) {
                  logger.error('occur error : ', err);
                  return callback(err, { code: 102, p: 5 });
                }

                try {
                        // 把返回来的json字符串转换成json对象
                  data = JSON.parse(data.body);
                } catch (e) {
                  logger.error('美拍json数据解析失败');
                  logger.info(data);
                  return callback(e, { code: 102, p: 5 });
                }
                let contents = data,
                  contLength = contents.length,
                  contNum = 0,
                  endPage = null;

                endPage = this.mpdeal(contLength, userVal, contents, endPage, callback);

                if (contents.length < 10) {
                  page = sign;
                  if (!endPage) {
                    console.log('您输入的值没找到');
                  }
                  return cb();
                }
                if (endPage) {
                  sign++;
                  page = sign;
                  return cb();
                }
                sign++;
                page++;
                return cb();
              });
            }
        );
  }
  toutiao(verifyData, callback) {
    let groupid = verifyData.remote.match(/\/a\d*/).toString().replace(/\/a/, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      sign = 1,
      page = 3;

    async.whilst(
            () => sign < page,
            (cb) => {
              const options = {
                url: `http://www.toutiao.com/group/${groupid}/comments/?count=10&page=${sign}&item_id=0&format=json`
              };
              request.get(logger, options, (err, data) => {
                if (err) {
                  logger.error('occur error : ', err);
                  return callback(err, { code: 102, p: 6 });
                }

                try {
                        // 把返回来的json字符串转换成json对象
                  data = JSON.parse(data.body);
                } catch (e) {
                  logger.error('头条json数据解析失败');
                  logger.info(data);
                  return callback(e, { code: 102, p: 6 });
                }
                let contents = data.data.comments,
                  total = data.data.comment_pagination.total_count,
                  contLength = contents.length,
                  contNum = 0,
                  endPage = null;

                endPage = this.ttdeal(contLength, userVal, contents, endPage, callback);

                if (contents.length < 10) {
                  page = sign;
                  if (!endPage) {
                    console.log('您输入的值没找到');
                  }
                  return cb();
                }
                if (endPage) {
                  sign++;
                  page = sign;
                  return cb();
                }
                sign++;
                page++;
                return cb();
              });
            }
        );
  }
  miaopai(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      scid = htmlUrl.match(/show\/~*\w*-*\w*/).toString().replace(/show\//, ''),
      options = {
        url: htmlUrl
      };

    request.get(logger, options, (err, htmlData) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 7 });
      }

      let $ = cheerio.load(htmlData.body),
        script = $('script')[5].children[0].data;
      if (script == undefined) {
        logger.debug('秒拍请求的源码结构发生改变');
        return callback(e, { code: 102, p: 7 });
      }
      const total = script.match(/var total = \d*/).toString().replace(/var total = /, '');
      let sign = 1,
        page = 0;

      if (total % 10 == 0) {
        page = total / 10;
      } else {
        page = Math.ceil(total / 10);
      }
      async.whilst(
                () => sign < page,
                (cb) => {
                  const dataUrl = {
                    url: `http://www.miaopai.com/miaopai/get_v2_comments?scid=${scid}&per=10&page=${sign}`
                  };
                  request.get(logger, dataUrl, (err, data) => {
                    if (err) {
                      logger.error('occur error : ', err);
                      return callback(err, { code: 102, p: 7 });
                    }

                    let jq = cheerio.load(data.body),
                      oli = jq('li'),
                      liLength = jq('li').length,
                      contsNum = 0,
                      endPage = null;
                    async.whilst(
                            () => contsNum < 10,
                            (cb) => {
                              let empty = jq('li div>span').eq(contsNum).children().empty(),
                                ospan = jq('li div>span').eq(contsNum).text(),
                                suidUrl = jq('li div>a').eq(contsNum).attr('href'),
                                _nick = jq('li div>a>b').eq(contsNum).text(),
                                dataJson = {};
                              suidUrl = {
                                url: `http://www.miaopai.com${suidUrl}`
                              };
                              ospan = ospan.replace(/回复/, '');
                              ospan = ospan.replace(/\s/g, '');
                              if (userVal == ospan) {
                                request.get(logger, suidUrl, (err, suidData) => {
                                  if (err) {
                                    logger.error('occur error : ', err);
                                    return callback(err, { code: 102, p: 7 });
                                  }

                                  let jQ = cheerio.load(suidData.body),
                                    suidScr = jQ('script')[4].children[0].data;
                                  if (suidScr == undefined) {
                                    logger.debug('秒拍请求的源码结构发生改变');
                                    return callback(e, { code: 102, p: 7 });
                                  }
                                  const suids = suidScr.match(/var suids=\"\w*\-*\w*/).toString().replace(/var suids=\"/, '');
                                  if (suids == undefined) {
                                    logger.debug('秒拍请求的源码结构发生改变');
                                    return callback(e, { code: 102, p: 7 });
                                  }
                                  dataJson.id = suids;
                                  console.log(`评论用户Id：${suids}`);
                                  callback(null, dataJson);
                                });
                                dataJson.name = _nick;
                                dataJson.p = 7;
                                console.log(`评论内容：${ospan}`);
                                console.log(`评论用户昵称：${_nick}`);
                                contsNum = 10;
                                endPage = true;
                                return cb();
                              }
                              endPage = false;
                              contsNum++;
                              return cb();
                            }
                        );
                    if (endPage == true) {
                      page = 0;
                      sign++;
                      return cb();
                    } else if (endPage != true) {
                      sign++;
                      if (sign == page) {
                        console.log('您输入的值没找到');
                      }
                      return cb();
                    }
                    sign++;
                    return cb();
                  });
                }
            );
    });
  }
  bili(verifyData, callback) {
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      dataJson = {},
      pn = 1,
      pageNum = 2;
    async.whilst(
                    () => pn < pageNum,
                    (cb) => {
                      let oid = htmlUrl.match(/av\d*/).toString().replace('av', ''),
                        newUrl = {
                          url: `http://api.bilibili.com/x/v2/reply?&nohot=1&type=1&pn=${pn}&oid=${oid}`
                        };
                      request.get(logger, newUrl, (err, data) => {
                        if (err) {
                          logger.error('occur error : ', err);
                          return callback(err, { code: 102, p: 8 });
                        }

                        try {
                          data = JSON.parse(data.body);
                        } catch (e) {
                          logger.error('哔哩哔哩json数据解析失败');
                          logger.info('json error: ', data);
                          return callback(e, { code: 102, p: 8 });
                        }
                        let datas = data.data,
                          acount = datas.page.acount,
                          replies = datas.replies;
                        if (acount % 20 == 0) {
                          pageNum = acount / 20;
                        } else {
                          pageNum = Math.ceil(acount / 20);
                        }
                        for (let i = 0; i < replies.length; i++) {
                          if (verifyCode == replies[i].content.message) {
                            dataJson.p = '8';
                            dataJson.id = replies[i].member.mid;
                            dataJson.name = replies[i].member.uname;
                            logger.debug('找到了');
                            return callback(null, dataJson);
                          }
                        }
                        pn++;
                        return cb();
                      });
                    },
                    (err) => {
                      if (err) {
                        return callback(err);
                      }
                      logger.debug('亲，没有你要找的内容');
                    }
                );
  }
  sohu(verifyData, callback) {
        /*
         * 1、首先在视频网页找到vid
         * 2、吧vid传参给http://changyan.sohu.com/api/2/topic/load?client_id=cyqyBluaj&topic_url=http%3A%2F%2Ftv.sohu.com%2F20150913%2Fn420999556.shtml&topic_source_id="+vid+"&page_size=10借口
         * 3.在上面的借口里面找到 topic_id
         * 4、再把topic_id传给借口http://changyan.sohu.com/api/2/topic/comments?client_id=cyqyBluaj&page_no=2&page_size=10&topic_id=764790010
         * 5、查找对应 的用户和id
         * */
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      dataJson = {},
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, data) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 9 });
      }

      let $ = cheerio.load(data.body),
        script = $('script')[4].children[0].data,
        vid = script.match(/vid=\"[\d]*/).toString().replace(/vid=\"/, ''),
        playlistId = script.match(/playlistId=\"[\d]*/).toString().replace(/playlistId=\"/, ''),
        loadUrl = {
          url: `http://changyan.sohu.com/api/2/topic/load?client_id=cyqyBluaj&topic_url=http%3A%2F%2Ftv.sohu.com%2F20150913%2Fn420999556.shtml&topic_source_id=${vid}&page_size=10`
        };
            // logger.debug(playlistId)
            // logger.debug(vid)
      request.get(logger, loadUrl, (err, data) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 9 });
        }

        try {
          data = JSON.parse(data.body);
        } catch (e) {
          logger.error('搜狐json数据解析失败');
          logger.info('json error: ', data);
          return callback(e, { code: 102, p: 9 });
        }
        let page = 1, pageCount,
          total = data.cmt_sum;
        const topic_id = data.topic_id;
        if (total % 10 == 0) {
          pageCount = acount / 10;
        } else {
          pageCount = Math.ceil(total / 10);
        }
        const newUrl = {
          url: `http://changyan.sohu.com/api/2/topic/comments?client_id=cyqyBluaj&page_no=${page}&page_size=10&topic_id=${topic_id}`
        };
        request.get(logger, newUrl, (err, data) => {
          if (err) {
            logger.error('occur error : ', err);
            return callback(err, { code: 102, p: 9 });
          }

          try {
            data = JSON.parse(data.body);
          } catch (e) {
            logger.error('搜狐json数据解析失败');
            logger.info('json error: ', data);
            return callback(e, { code: 102, p: 9 });
          }
          const comments = data.comments;
          async.whilst(
                        () => page < pageCount,
                        (cb) => {
                          const newUrl = {
                            url: `http://changyan.sohu.com/api/2/topic/comments?client_id=cyqyBluaj&page_no=${page}&page_size=10&topic_id=${topic_id}`
                          };
                          request.get(logger, newUrl, (err, data) => {
                            if (err) {
                              logger.error('occur error : ', err);
                              return callback(err, { code: 102, p: 9 });
                            }

                            try {
                              data = JSON.parse(data.body);
                            } catch (e) {
                              logger.error('搜狐json数据解析失败');
                              logger.info('json error: ', data);
                              return callback(e, { code: 102, p: 9 });
                            }
                            const comments = data.comments;
                            for (let i = 0; i < comments.length; i++) {
                              if (verifyCode == comments[i].content) {
                                dataJson.p = '9';
                                dataJson.id = comments[i].passport.user_id;
                                dataJson.name = comments[i].passport.nickname;
                                return callback(null, dataJson);
                              }
                            }
                            page++;
                            cb();
                          });
                        },
                        (err) => {
                          if (err) {
                            return callback(err);
                          }
                          logger.debug('没找到');
                        }
                    );
        });
      });
    });
  }
  kuaibao(verifyData, callback) {
    let commentid = verifyData.remote.match(/commentid=\d*/).toString().replace(/commentid=/, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      sign = 1,
      page = 2,
      commenLast = '';

    async.whilst(
            () => sign <= page,
            (cb) => {
              const options = {
                url: `http://coral.qq.com/article/${commentid}/comment?commentid=${commenLast}&reqnum=10`
              };
              request.get(logger, options, (err, data) => {
                if (err) {
                  logger.error('occur error : ', err);
                  return callback(err, { code: 102, p: 10 });
                }

                try {
                  data = JSON.parse(data.body);
                } catch (e) {
                  logger.error('快报json数据解析失败');
                  logger.info(data);
                  return callback(e, { code: 102, p: 10 });
                }
                    // 最新的评论是commentid不赋值
                    // 上一页的评论
                    // 下一页的评论
                    // 获取到的评论数据
                    // 评论总数
                let maxid = data.data.maxid,
                  first = data.data.first,
                  last = data.data.last,
                  contents = data.data.commentid,
                  total = data.data.total,
                  contNum = 0,
                  contLength = contents.length,
                  endPage = null;
                commenLast = last;
                if (total % 10 == 0) {
                  page = total / 10;
                } else {
                  page = Math.ceil(total / 10);
                }

                endPage = this.kbdeal(contLength, userVal, contents, endPage, callback);
                if (sign == page) {
                  if (!endPage) {
                    console.log('您输入的值没找到');
                    sign++;
                    return cb();
                  }
                }
                if (endPage) {
                  sign++;
                  page = 0;
                  return cb();
                }
                sign++;
                return cb();
              });
            }

        );
  }
  yidian(verifyData, callback) {
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      dataJson = {},
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, data) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 11 });
      }

      let $ = cheerio.load(data.body),
        last_comment_id = '',
        script = $('script')[2].children[0].data,
        docid = script.match(/yidian.article_docid = \"[\w\d]*/).toString().replace(/yidian.article_docid = \"/, '');
      let option = {
          url: `http://www.yidianzixun.com/api/q/?path=contents/comments&version=999999&docid=${docid}&count=30`
        },
        page = 1,
        pageCount = 10;
      request.get(logger, option, (err, data) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 11 });
        }

        try {
          data = JSON.parse(data.body);
        } catch (e) {
          logger.error('一点资讯json数据解析失败');
          logger.info('json error: ', data);
          return callback(e, { code: 102, p: 11 });
        }
        let comments = data.comments,
          last_comment_id = {
            last_comment_id: ''
          };
        async.whilst(
                    () => page < pageCount,
                    (cb) => {
                      const dataUrl = {
                        url: `http://www.yidianzixun.com/api/q/?path=contents/comments&version=999999&docid=${docid}&count=30&${last_comment_id.last_comment_id}`
                      };
                      request.get(logger, dataUrl, (err, data) => {
                        if (err) {
                          logger.error('occur error : ', err);
                          return callback(err, { code: 102, p: 11 });
                        }

                        try {
                          data = JSON.parse(data.body);
                        } catch (e) {
                          logger.error('一点资讯json数据解析失败');
                          logger.info('json error: ', data);
                          return callback(e, { code: 102, p: 11 });
                        }
                        const comment = data.comments;
                        if (comments.length < 30) {
                          for (let i = 0; i < comments.length; i++) {
                            if (verifyCode == comment[i].comment) {
                              dataJson.P = 11;
                              dataJson.name = comment[i].nickname;
                              dataJson.name = comment[i].comment_id;
                              logger.debug('找到了');
                              return callback(null, dataJson);
                            }
                            page = pageCount + 100;
                            return logger.debug('没找到');
                          }
                        }
                        for (let j = 0; j < comment.length; j++) {
                          if (verifyCode == comment[j].comment) {
                            dataJson.P = 11;
                            dataJson.name = comment[j].nickname;
                            dataJson.name = comment[j].comment_id;
                            logger.debug('找到了');
                            page = pageCount + 10;
                            return callback(null, dataJson);
                          }
                        }
                        page++;
                        pageCount++;
                        last_comment_id.last_comment_id = `last_comment_id${comment[comment.length - 1].comment_id}`;
                        return cb();
                      });
                    },
                    (err) => {
                      if (err) {
                        return callback(err);
                      }
                      return logger.debug('没找到');
                    }
                );
      });
    });
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
        return callback(err, { code: 102, p: 12 });
      }

      let comments = htmlData.body,
        iid = comments.match(/\,iid: \d*/).toString().replace(/\,iid: /, '');

      if (iid == undefined) {
        logger.debug('土豆请求的源码结构发生改变');
        return callback(e, { code: 102, p: 12 });
      }

      let sign = 1,
        page = 2;
      async.whilst(
                () => sign <= page,
                (cb) => {
                  const dataUrl = {
                    url: `http://www.tudou.com/comments/itemnewcomment.srv?iid=${iid}&page=${sign}&rows=10&cmtid=0&tm=21&ids=&charset=utf-8&app=anchor`
                  };
                  request.get(logger, dataUrl, (err, data) => {
                    if (err) {
                      logger.error('occur error : ', err);
                      return callback(err, { code: 102, p: 12 });
                    }

                    try {
                      data = JSON.parse(data.body);
                    } catch (e) {
                      logger.error('土豆json数据解析失败');
                      logger.info(data);
                      return callback(e, { code: 102, p: 12 });
                    }

                    let content = data,
                      total = content.total,
                      contents = content.data,
                      contLength = contents.length,
                      endPage = null;

                    endPage = this.tddeal(contLength, userVal, contents, endPage, callback);

                    if (total % 10 == 0) {
                      page = total / 10;
                    } else {
                      page = Math.ceil(total / 10);
                    }
                    if (sign == page) {
                      if (!endPage) {
                        console.log('您输入的值没找到');
                        sign++;
                        return cb();
                      }
                    }
                    if (endPage) {
                      sign++;
                      page = 0;
                      return cb();
                    }
                    sign++;
                    return cb();
                  });
                }
            );
    });
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
        return callback(err, { code: 102, p: 13 });
      }

      let $ = cheerio.load(htmlData.body),
        script = $('script')[0].children[0].data,
        flvid = script.match(/var flvid = \d*/).toString().replace(/var flvid = /, '');

      if (flvid == undefined) {
        logger.debug('爆米花请求的源码结构发生改变');
        return callback(e, { code: 102, p: 13 });
      }

      let sign = 1,
        page = 2;

      async.whilst(
                () => sign < page,
                (cb) => {
                  const dataUrl = {
                    url: ` http://m.interface.baomihua.com/Interfaces/getlist.ashx?objid=${flvid}&page=${sign}&type=rlist&vs=36`
                  };
                  request.get(logger, dataUrl, (err, data) => {
                    if (err) {
                      logger.error('occur error : ', err);
                      return callback(err, { code: 102, p: 13 });
                    }

                    try {
                      data = JSON.parse(data.body);
                    } catch (e) {
                      logger.error('爆米花json数据解析失败');
                      logger.info(data);
                      return callback(e, { code: 102, p: 13 });
                    }

                    let content = data,
                      contents = content.result.item,
                      contLength = contents.length,
                      endPage = null;

                    endPage = this.bmhdeal(contLength, userVal, contents, endPage, callback);

                    if (contLength < 10) {
                      page = sign;
                      if (!endPage) {
                        console.log('您输入的值没找到');
                      }
                      return cb();
                    }
                    if (endPage) {
                      sign++;
                      page = sign;
                      return cb();
                    }
                    sign++;
                    page++;
                    return cb();
                  });
                }
            );
    });
  }
  ku6(verifyData, callback) {
    let htmlUrl = verifyData.remote.match(/show\/\-*\w*\-*\w*\-*\w*\.{2}/).toString().replace(/show\//, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      sign = 1,
      page = 2;

    async.whilst(
            () => sign <= page,
            (cb) => {
              const options = {
                url: `http://comment.ku6.com/api/list.jhtm?id=${htmlUrl}&vtype=111&type=2&size=10&pn=${sign}`
              };
              request.get(logger, options, (err, data) => {
                if (err) {
                  logger.error('occur error : ', err);
                  return callback(err, { code: 102, p: 14 });
                }

                try {
                  data = JSON.parse(data.body);
                } catch (e) {
                  logger.error('ku6json数据解析失败');
                  logger.info(data);
                  return callback(e, { code: 102, p: 14 });
                }
                let content = data,
                  contents = content.data.list,
                  contLength = contents.length,
                  endPage = null,
                  total = content.data.count;

                if (total % 10 == 0) {
                  page = total / 10;
                } else {
                  page = Math.ceil(total / 10);
                }
                endPage = this.ku6deal(contLength, userVal, contents, endPage, callback);
                if (sign == page) {
                  if (!endPage) {
                    console.log('您输入的值没找到');
                    sign++;
                    return cb();
                  }
                }
                if (endPage) {
                  sign++;
                  page = 0;
                  return cb();
                }
                sign++;

                return cb();
              });
            }
        );
  }
  btime(verifyData, callback) {
    const verifyCode = verifyData.verifyCode;
    let htmlUrl = verifyData.remote,
      dataJson = {},
      page = 1,
      pages = 2,
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, data) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 15 });
      }

      let $ = cheerio.load(data.body),
        script = $('script')[0].children[0].data,
        fid = script.match(/id=[\w\d]*/).toString().replace(/id=/, '');
      async.whilst(
                    () => page <= pages,
                    (cb) => {
                      const dataUrl = {
                        url: `http://gcs.so.com/comment/lists?type=1&num=5&sub_limit=5&page=${page}&client_id=25&url=http%253A%252F%252Frecord.btime.com%252Fnews%253Fid%253D${fid}`
                      };
                      request.get(logger, dataUrl, (err, result) => {
                        if (err) {
                          logger.error('occur error : ', err);
                          return callback(err, { code: 102, p: 15 });
                        }

                        try {
                          result = JSON.parse(result.body);
                        } catch (e) {
                          logger.error('北京时间json数据解析失败');
                          logger.info('json error: ', result);
                          return callback(e, { code: 102, p: 15 });
                        }
                        const comments = result.data.comments;
                        pages = result.data.pages;
                        for (let i = 0; i < comments.length; i++) {
                          if (verifyCode == comments[i].message) {
                            const nick_name = JSON.parse(comments[i].user_info);
                            dataJson.p = '15';
                            dataJson.name = nick_name.nick_name;
                            dataJson.id = comments[i].id;
                            logger.debug('找到了');
                            return callback(null, dataJson);
                          }
                        }
                        page++;
                        return cb();
                      });
                    },
                    (err) => {
                      if (err) {
                        return callback(err);
                      }
                      return logger.debug('没找到');
                    }
                );
    });
  }
  weishi(verifyData, callback) {
    let _id = verifyData.remote.match(/\/t\/\d*/).toString().replace(/\/t\//, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      sign = 1,
      page = 2,
      pageflag = 1,
      lastid = '',
      htmlUrl = {
        url: verifyData.remote
      };
    request.get(logger, htmlUrl, (err, htmlData) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 16 });
      }

      let $ = cheerio.load(htmlData.body),
        pagetime = $('ul[class="pt10"]>li');

      if (pagetime == undefined) {
        logger.debug('微视请求的源码结构发生改变');
        return callback(e, { code: 102, p: 16 });
      }

      pagetime = pagetime.eq(pagetime.length - 1).attr('timestamp');

      async.whilst(
                () => sign <= page,
                (cb) => {
                  const options = {
                    url: `http://wsi.weishi.com/weishi/t/relist.php?v=p&g_tk=45991169&r=1479868708804&id=${_id}&pageflag=${pageflag}&pagetime=${pagetime}&lastid=${lastid}&reqnum=5`,
                    referer: `http://weishi.qq.com/t/${_id}`
                  };

                  request.get(logger, options, (error, data) => {
                    if (err) {
                      logger.error('occur error : ', err);
                      return callback(err, { code: 102, p: 16 });
                    }

                    try {
                      data = JSON.parse(data.body);
                    } catch (e) {
                      logger.error('微视json数据解析失败');
                      logger.info(data);
                      return callback(e, { code: 102, p: 16 });
                    }

                    let content = data,
                      contents = content.data.info,
                      contLength = contents == undefined ? 0 : contents.length,
                      endPage = null,
                      total = content.data.total;
                    endPage = this.wsdeal(contLength, userVal, contents, endPage, callback);

                    if (contLength <= 0) {
                      if (!endPage) {
                        console.log('您输入的值没找到');
                        sign++;
                        page = 0;
                        return cb();
                      }
                    }

                    if (endPage) {
                      sign++;
                      page = 0;
                      return cb();
                    }
                    pagetime = contents[contLength - 1].timestamp;
                    lastid = contents[contLength - 1].id;
                    sign++;
                    page++;
                    pageflag = 2;
                    return cb();
                  });
                }
            );
    });
  }
  xiaoying(verifyData, callback) {
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      vid = htmlUrl.match(/\/v\/[\w\d]*/).toString().replace('/v/', ''),
      request = require('request'),
      dataJson = {},
      page = 1,
      pageCount = 2;
    async.whilst(
                () => page <= pageCount,
                (cb) => {
                  const option = { method: 'POST',
                    url: 'http://viva.api.xiaoying.co/api/rest/p/pa',
                    form:
                    { I: '201611231037006',
                      a: 'pa',
                      i: `{"a":"${vid}","b":"1","c":${page},"d":30}`,
                      b: '1.0',
                      c: '10013007',
                      j: '88eab0c6230a864acbf2a712fd614bf6',
                      e: 'DAq3Uzby',
                      d: '494abcd8b0af6a98f363369719ba71fc',
                      k: '5.3.1',
                      f: vid,
                      h: '2|285dc909ea28a577293b4eabb65191b2f62e7410ef1ce4b83d9599de338efe3c3b950f9c38170894' },
                    headers:
                    {
                      'content-type': 'application/x-www-form-urlencoded' }
                  };

                  request(option, (error, response, body) => {
                    if (error) throw new Error(error);
                    try {
                      body = JSON.parse(body);
                    } catch (e) {
                      logger.error('小影json数据解析失败');
                      logger.info('json error: ', body);
                      return callback(e, { code: 102, p: 17 });
                    }

                    let comments = body.comments,
                      total = body.total;
                    if (total % 0 == 0) {
                      pageCount = total / 30;
                    } else {
                      pageCount = Math.ceil(total / 30);
                    }
                    for (let i = 0; i < comments.length; i++) {
                      if (verifyCode == comments[i].content) {
                        dataJson.p = '17';
                        dataJson.name = comments[i].user.nickName;
                        dataJson.id = comments[i].user.auid;
                        logger.debug('找到了');
                        return callback(null, dataJson);
                      }
                    }
                    page++;
                    return cb();
                  });
                },
                (err) => {
                  if (err) {
                    return callback(err);
                  }
                  return logger.debug('没找到');
                }
            );
  }
  budejie(verifyData, callback) {
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      dataJson = {},
      page = 1,
      pageCount = 2,
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, data) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 18 });
      }

      let $ = cheerio.load(data.body),
        script = $('script')[1].children[0].data,
                // data_id=script.match(/.com\/[\w\d]*/).toString().replace(/id=/,"")
        data_id = script.match(/detail-[\d]*/)[0].toString().replace('detail-', '');
      async.whilst(
                    () => page <= pageCount,
                    (cb) => {
                      const newURL = {
                        url: `http://api.budejie.com/api/api_open.php?a=datalist&per=5&c=comment&data_id=${data_id}&page=${page}`
                      };
                      request.get(logger, newURL, (err, result) => {
                        if (err) {
                          logger.error('occur error : ', err);
                          return callback(err, { code: 102, p: 18 });
                        }

                        try {
                          result = JSON.parse(result.body);
                        } catch (e) {
                          logger.error('不得姐json数据解析失败');
                          logger.info('json error: ', result);
                          return callback(e, { code: 102, p: 18 });
                        }
                        let total = result.total,
                          datas = result.data;
                        if (total % 5 == 0) {
                          pageCount = total / 5;
                        } else {
                          pageCount = Math.ceil(total / 5);
                        }
                        for (let i = 0; i < datas.length; i++) {
                          if (verifyCode == datas[i].content) {
                            dataJson.p = '18';
                            dataJson.name = datas[i].user.username;
                            dataJson.id = datas[i].user.id;
                            logger.debug('找到了');
                            return callback(null, dataJson);
                          }
                        }
                        page++;
                        return cb();
                      });
                    },
                    (err) => {
                      if (err) {
                        return callback(err);
                      }
                      return logger.debug('没找到');
                    }
                );
    });
  }
  neihan(verifyData, callback) {
    let htmlUrl = verifyData.remote.match(/\/p\d*/).toString().replace(/\/p/, ''),
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      sign = 1,
      page = 2,
      offset = 0;
    async.whilst(
            () => sign <= page,
            (cb) => {
              const options = {
                url: `http://neihanshequ.com/m/api/get_essay_comments/?group_id=${htmlUrl}&app_name=neihanshequ_web&offset=${offset}`
              };
              request.get(logger, options, (err, data) => {
                if (err) {
                  logger.error('occur error : ', err);
                  return callback(err, { code: 102, p: 19 });
                }

                try {
                  data = JSON.parse(data.body);
                } catch (e) {
                  logger.error('内涵段子json数据解析失败');
                  logger.info(data);
                  return callback(e, { code: 102, p: 19 });
                }
                let content = data,
                  contents = content.data.recent_comments,
                  contLength = contents.length,
                  total = content.total_number,
                  endPage = null;

                if (total % 20 == 0) {
                  page = total / 20;
                } else {
                  page = Math.ceil(total / 20);
                }

                endPage = this.nhdeal(contLength, userVal, contents, endPage, callback);

                if (sign == page) {
                  if (!endPage) {
                    console.log('您输入的值没找到');
                    sign++;
                    return cb();
                  }
                }
                if (endPage) {
                  sign++;
                  page = 0;
                  return cb();
                }
                sign++;
                offset += 20;
                return cb();
              });
            }
        );
  }
  yy(verifyData, callback) {
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      dataJson = {},
      index = 0,
      pageCount = 2,
      options = {
        url: htmlUrl
      };
    request.get(logger, options, (err, data) => {
      let $ = cheerio.load(data.body),
        script = $('script')[14].children[0].data,
            // //data_id=script.match(/.com\/[\w\d]*/).toString().replace(/id=/,"")
        resid = script.match(/resid: \"[\d]*/).toString().replace('resid: "', '');
      async.whilst(
                    () => index / 10 <= pageCount,
                    (cb) => {
                      const newURL = {
                        url: `http://www.yy.com/video/play/page/danmu?resid=${resid}&type=4&index=${index}&size=10`
                      };
                      request.get(logger, newURL, (err, data) => {
                        if (err) {
                          logger.error('occur error : ', err);
                          return callback(err, { code: 102, p: 20 });
                        }

                        try {
                          data = JSON.parse(data.body);
                        } catch (e) {
                          logger.error('YYjson数据解析失败');
                          logger.info('json error: ', data);
                          return callback(e, { code: 102, p: 20 });
                        }
                        let lists = data.data.list,
                          total = data.data.total;
                        if (pageCount % 10 == 0) {
                          pageCount = total / 10;
                        } else {
                          pageCount = Math.ceil(total / 10);
                        }
                        for (let i = 0; i < lists.length; i++) {
                          if (verifyCode == lists[i].content) {
                            dataJson.p = '20';
                            dataJson.name = lists[i].nickname;
                            dataJson.id = lists[i].yyno;
                            logger.debug('找到了');
                            return callback(null, dataJson);
                          }
                        }
                        index += 10;
                            // console.log("第"+index/10+"页","总共"+pageCount+"页")
                        return cb();
                      });
                    },
                    (err) => {
                      if (err) {
                        return callback(err);
                      }
                      return logger.debug('meizhaodao');
                    }
                );
    });
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
          return callback(err, { code: 102, p: 21 });
        }
        if (result.statusCode != 200) {
          logger.error('tv56状态码错误', result.statusCode);
          logger.info(result);
          return callback(true, { code: 102, p: 21 });
        }
        const $ = cheerio.load(result.body);
        result = result.body.replace(/[\s\n\r]/g, '');
        vid = result.match(/sohuVideoInfo=\{vid:\'\d*/).toString().replace(/sohuVideoInfo=\{vid:\'/, '');
        this.getTV56(userVal, vid, callback);
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
        return callback(err, { code: 102, p: 21 });
      }

      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('TV56评论总量解析失败');
        return callback(e, { code: 102, p: 21 });
      }
      this.getTV56comment(userVal, result.cmt_sum, result.topic_id, callback);
    });
  }
  getTV56comment(userVal, num, vid, callback) {
    let sign = 1,
      page = 2;
    async.whilst(
            () => sign <= page,
            (cb) => {
              const option = {
                url: `http://changyan.sohu.com/api/2/topic/comments?client_id=cyqyBluaj&page_size=30&topic_id=${vid}&page_no=${sign}&_=${new Date().getTime()}`
              };
              request.get(logger, option, (err, data) => {
                if (err) {
                  logger.error('occur error : ', err);
                  return callback(err, { code: 102, p: 21 });
                }

                try {
                  data = JSON.parse(data.body);
                } catch (e) {
                  logger.error('tv56 json数据解析失败');
                  logger.info(data);
                  return callback(e, { code: 102, p: 21 });
                }
                let contents = data.comments,
                  contLength = contents.length,
                  endPage = null;

                if (num % 30 == 0) {
                  page = num / 30;
                } else {
                  page = Math.ceil(num / 30);
                }

                endPage = this.tv56deal(contLength, userVal, contents, endPage, callback);
                if (sign == page) {
                  if (!endPage) {
                    console.log('您输入的值没找到');
                    sign++;
                    page = 0;
                    callback(null, { code: 105, p: 21 });
                    return cb();
                  }
                }
                if (endPage) {
                  sign++;
                  page = 0;
                  return cb();
                }
                sign++;
                return cb();
              });
            }
        );
  }
  tv56deal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 21;
        dataJson.id = contents[i].passport.user_id;
        dataJson.name = contents[i].passport.nickname;
        console.log(`评论内容：${contents[i].content}`);
        console.log(`评论用户Id：${contents[i].passport.user_id}`);
        console.log(`评论用户昵称：${contents[i].passport.nickname}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  acfun(verifyData, callback) {
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      contentId = htmlUrl.match(/\/ac[\d]*/).toString().replace('/ac', ''),
      dataJson = {},
      page = 1,
      totalPage = 2;
    async.whilst(
                () => page <= totalPage,
                (cb) => {
                  const options = {
                    url: `http://www.acfun.tv/comment_list_json.aspx?isNeedAllCount=true&contentId=${contentId}&currentPage=${page}`
                  };
                  console.log(options.url);
                  request.get(logger, options, (err, data) => {
                    if (err) {
                      logger.error('occur error : ', err);
                      return callback(err, { code: 102, p: 22 });
                    }

                    try {
                      data = JSON.parse(data.body);
                    } catch (e) {
                      logger.error('A站json数据解析失败');
                      logger.info('json error: ', data);
                      return callback(e, { code: 102, p: 22 });
                    }
                    const commentContentArr = data.data.commentContentArr;
                    totalPage = data.data.totalPage;
                    for (const current in commentContentArr) {
                      if (verifyCode == commentContentArr[current].content) {
                        dataJson.p = '22';
                        dataJson.name = commentContentArr[current].userName;
                        dataJson.id = commentContentArr[current].userID;
                        return callback(null, dataJson);
                      }
                    }
                    page++;
                    return cb();
                  });
                },
                (err) => {
                  if (err) {
                    return callback(err);
                  }
                  return logger.debug('meizhaodao');
                }
            );
  }
  weibo(verifyData, callback) {
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).hostname,
      vhot = '',
      vid = '',
      page = 1,
      sign = 2,
      endPage = null,
      contents = '',
      contLength = '',
      total = 0,
      option = {
        url: ''
      };
    if (host == 'm.weibo.cn') {
      vid = htmlUrl.match(/\/[\d | \w]*\?/).toString().replace(/[\/\?]/g, '');
      if (vid == 'qq') {
        vid = htmlUrl.match(/\/\d*qq\?/).toString().replace(/[\/qq\?]/g, '');
      }
    } else if (host == 'weibo.com') {

    }
    async.whilst(
            () => page < sign,
            (cb) => {
              option.url = `http://m.weibo.cn/article/rcMod?id=${vid}&type=comment&page=${page}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.error('occur error: ', err);
                  return callback(err, { code: 102, p: 23 });
                }

                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('微博数据解析失败');
                  return callback(e, { code: 102, p: 23 });
                }

                contents = result.data;
                if (contents == undefined) {
                  sign = 0;
                  logger.debug('您输入的数据没找到');
                  callback(null, { code: 105, p: 23 });
                  return cb();
                }
                contLength = contents.length;
                endPage = this.weibodeal(contLength, userVal, contents, endPage, callback);
                if (endPage) {
                  sign = 0;
                  return cb();
                }
                sign++;
                page++;
                return cb();
              });
            }
        );
  }
  ifeng(verifyData, callback) {
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      index = htmlUrl.match(/\d{6}\//),
      docUrl = htmlUrl.substring(htmlUrl.indexOf(index), htmlUrl.length).replace(/\d{6}\//, '').replace('.shtml', ''),
      page = 1,
      pages = 2,
      dataJson = {};
    async.whilst(
                () => page <= pages,
                (cb) => {
                  const options = {
                    url: `http://comment.ifeng.com/geti?docUrl=${docUrl}&p=${page}&pagesize=10`
                  };
                  request.get(logger, options, (err, result) => {
                    if (err) {
                      logger.error('occur error : ', err);
                      return callback(err, { code: 102, p: 24 });
                    }

                    try {
                      result = JSON.parse(result.body);
                    } catch (e) {
                      logger.error('凤凰卫视json数据解析失败');
                      logger.info('json error: ', result);
                      return callback(e, { code: 102, p: 24 });
                    }
                    let comments = result.comments.newest,
                      totalPage = result.count;
                    if (totalPage % 10 == 0) {
                      pages = totalPage / 10;
                    } else {
                      pages = Math.ceil(totalPage / 10);
                    }
                    for (let i = 0; i < comments.length; i++) {
                      if (verifyCode == comments[i].comment_contents) {
                        dataJson.p = '24';
                        dataJson.name = comments[i].uname;
                        dataJson.id = comments[i].user_id;
                        return callback(null, dataJson);
                      }
                    }
                    page++;
                    return cb();
                  });
                },
                (err) => {
                  if (err) {
                    return callback(err);
                  }
                  return logger.debug('meizhaodao');
                }
            );
  }
  wangyi(verifyData, callback) {
    let verifyCode = verifyData.verifyCode,
      htmlUrl = verifyData.remote,
      hostname = URL.parse(htmlUrl, true).hostname,
      dataJson = {},
      indexCount = htmlUrl.match(/[\w\d]{9}\//),
      flagId;
    switch (hostname) {
      case 'v.163.com':
        flagId = htmlUrl.substring(htmlUrl.indexOf(indexCount), htmlUrl.length).replace(indexCount, '').replace('.html', '');
        break;
      case 'c.m.163.com':
                // console.log("fenxiang")
        flagId = htmlUrl.match(/v\/[\w\d]{9}/).toString().replace('v/', '');
    }
    const option = {
      url: `http://c.m.163.com/nc/video/detail/${flagId}.html`
    };
        // console.log(hostname)
    request.get(logger, option, (err, data) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 25 });
      }

      try {
        data = JSON.parse(data.body);
      } catch (e) {
        logger.error('网易json数据解析失败');
        logger.info('json error: ', data);
        return callback(e, { code: 102, p: 25 });
      }
      let replyId = data.replyid,
        count = 0,
        currentPage = 10,
        options = {
          url: `http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/${replyId}/app/comments/newList?offset=${count}&limit=20`
        };
      async.whilst(
                () => count / 20 <= currentPage,
                (cb) => {
                  const option = {
                    url: `http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/${replyId}/app/comments/newList?offset=${count}&limit=20`
                  };
                  request.get(logger, option, (err, result) => {
                    if (err) {
                      logger.error('occur error : ', err);
                      return callback(err, { code: 102, p: 25 });
                    }

                    try {
                      result = JSON.parse(result.body);
                    } catch (e) {
                      logger.error('网易json数据解析失败');
                      logger.info('json error: ', result);
                      return callback(e, { code: 102, p: 25 });
                    }
                    let totalComments = result.newListSize,
                      comments = result.comments;
                    if (totalComments % 20 == 0) {
                      currentPage = totalComments / 20;
                    } else {
                      currentPage = Math.ceil(totalComments / 20);
                    }
                    for (const comment in comments) {
                      if (verifyCode == comments[comment].content) {
                        logger.debug('zhaodaole');
                        dataJson.p = '25';
                        dataJson.id = comments[comment].user.userId;
                        dataJson.name = comments[comment].user.nickname;
                        return callback(null, dataJson);
                      }
                    }
                    count += 20;
                    return cb();
                  });
                },
                (err) => {
                  if (err) {
                    return callback(err);
                  }
                  return logger.debug('meizhaodao');
                }
            );
    });
  }
  uc(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      host = URL.parse(htmlUrl, true).hostname,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      option = {
        url: htmlUrl
      },
      bid = '',
      options = {},
      aid = '',
      contLength = '',
      contents = '',
      endPage = null;
    if (host == 'v.mp.uc.cn') {
      const articleId = htmlUrl.match(/wm_aid=\w*/).toString().replace(/wm_aid=/, '');
      option.url = `http://napi.uc.cn/3/classes/article/objects/${articleId}?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_ch=article`;
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 26 });
        }

        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.error('UCjson数据解析失败');
          logger.info(result);
          return callback(e, { code: 102, p: 26 });
        }
        this.getUClist(result.data.xss_item_id, userVal, contLength, contents, endPage, callback);
      });
    } else {
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 26 });
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
          this.getUClist(aid, userVal, contLength, contents, endPage, callback);
        }
      });
    }
  }
  getUClist(aid, userVal, contLength, contents, endPage, callback) {
    let sign = 1,
      page = 2,
      options = {},
      hotScore = '';
    async.whilst(
            () => sign < page,
            (cb) => {
              options.url = `http://m.uczzd.cn/iflow/api/v2/cmt/article/${aid}/comments/byhot?count=10&fr=iphone&dn=11341561814-acaf3ab1&hotValue=${hotScore}`;
              request.get(logger, options, (err, data) => {
                if (err) {
                  logger.error('occur error : ', err);
                  return callback(err, { code: 102, p: 26 });
                }
                try {
                  data = JSON.parse(data.body);
                } catch (e) {
                  logger.debug('UC数据解析失败');
                }
                contLength = data.data.comments.length;
                contents = data.data.comments_map;
                endPage = this.ucdeal(contLength, userVal, contents, callback);

                if (endPage.endPage) {
                  page = sign;
                  return cb();
                }
                if (contLength <= 0) {
                  if (!endPage.endPage) {
                    page = 0;
                    logger.debug('您输入的值没找到');
                    callback(err, { code: 105, p: 26 });
                    return cb();
                  }
                } else {
                  hotScore = endPage.hotScore;
                  sign++;
                  page++;
                  return cb();
                }
              });
            }
        );
  }
  mgtv(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).hostname,
      vid = '',
      option = {},
      sign = 1,
      page = 2,
      contLength = '',
      contents = '',
      endPage = null;
    if (host == 'www.mgtv.com') {
      vid = htmlUrl.match(/\/\d*\.html/).toString().replace(/[\/\.html]/g, '');
    } else {
      vid = htmlUrl.match(/\/\d*\?/).toString().replace(/[\/\?]/g, '');
    }
    async.whilst(
            () => sign < page,
            (cb) => {
              option.url = `http://comment.hunantv.com/comment/read?device=iPhone&pageCount=${sign}&pageSize=30&videoId=${vid}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.error('occur error: ', err);
                  return callback(err, { code: 102, p: 27 });
                }

                try {
                  result = JSON.parse(result.body);
                } catch (e) {
                  logger.debug('芒果TV数据解析失败');
                  return callback(e, { code: 102, p: 27 });
                }
                contents = result.data;
                contLength = result.data.length;
                if (contLength <= 0) {
                  logger.debug('您输入的值没找到');
                  page = 0;
                  callback(null, { code: 105, p: 27 });
                  return cb();
                }
                endPage = this.mgdeal(contLength, userVal, contents, endPage, callback);
                if (endPage) {
                  page = 0;
                  return cb();
                }
                sign++;
                page++;
                return cb();
              });
            }
        );
  }
  QQqzone(verifyData, callback) {
    let htmlUrl = verifyData.remote,
      userVal = verifyData.verifyCode.replace(/\s/g, ''),
      host = URL.parse(htmlUrl, true).hostname,
      uin = '',
      tid = '',
      option = {},
      pos = 0,
      endPage = null,
      contents = '',
      contLength = '',
      sign = 1,
      page = 2;
    if (host == 'user.qzone.qq.com') {
      uin = htmlUrl.match(/com\/\d*/).toString().replace(/com\//, '');
      tid = htmlUrl.match(/mood\/\w*/).toString().replace(/mood\//, '');
      this.getQQqzoneComment(uin, tid, sign, page, contents, contLength, userVal, endPage, pos, callback);
    } else if (host == 'mobile.qzone.qq.com') {
      uin = htmlUrl.match(/&u=\d*/).toString().replace(/&u=/, '');
      tid = htmlUrl.match(/&i=\w*/).toString().replace(/&i=/, '');
      this.getQQqzoneComment(uin, tid, sign, page, contents, contLength, userVal, endPage, pos, callback);
    } else if (host == 'h5.qzone.qq.com') {
      uin = htmlUrl.match(/&uin=\d*/).toString().replace(/&uin=/, '');
      tid = htmlUrl.match(/&shuoshuo_id=\w*/).toString().replace(/&shuoshuo_id=/, '');
      this.getQQqzoneComment(uin, tid, sign, page, contents, contLength, userVal, endPage, pos, callback);
    } else {
      option.url = htmlUrl;
      request.get(logger, option, (err, result) => {
        if (err) {
          logger.error('occur error: ', err);
          return callback(err, { code: 102, p: 29 });
        }

        let $ = cheerio.load(result.body),
          script = $('script')[13].children[0].data,
          data = script.match(/"uin":"\d*","_wv":"\d*","_ws":"\d*","adtag":"\w*","is_video":"\w*","shuoshuo_id":"\w*","data/).toString().replace(/"uin/, '{"uin').replace(/,"data/, '}');
        try {
          data = JSON.parse(data);
        } catch (e) {
          logger.debug('QQ空间评论请求参数解析失败');
          return callback(e, { code: 102, p: 29 });
        }
        this.getQQqzoneComment(data.uin, data.shuoshuo_id, sign, page, contents, contLength, userVal, endPage, pos, callback);
      });
    }
  }
  getQQqzoneComment(uin, tid, sign, page, contents, contLength, userVal, endPage, pos, callback) {
    const option = {};
    async.whilst(
            () => sign < page,
            (cb) => {
              option.url = `https://h5.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msgdetail_v6?num=20&uin=${uin}&tid=${tid}&pos=${pos}`;
              request.get(logger, option, (err, result) => {
                if (err) {
                  logger.error('occur error: ', err);
                  return callback(err, { code: 102, p: 29 });
                }

                try {
                  result = eval(result.body);
                } catch (e) {
                  logger.debug('QQ空间数据解析失败');
                  return callback(e, { code: 102, p: 29 });
                }
                contents = result.commentlist;
                contLength = contents.length;
                let total = result.cmtnum,
                  num = 0;
                num += contLength;

                endPage = this.QQqzonedeal(contLength, userVal, contents, endPage, callback);
                if (num >= total) {
                  if (!endPage) {
                    logger.debug('您输入的值没找到');
                    page = 0;
                    callback(null, { code: 105, p: 29 });
                    return cb();
                  }
                }
                if (endPage) {
                  page = 0;
                  return cb();
                }
                sign++;
                page++;
                pos += 20;
                return cb();
              });
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


  weibodeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].text.replace(/\s/g, '')) {
        dataJson.p = 23;
        dataJson.id = contents[i].user.id;
        dataJson.name = contents[i].user.screen_name;
        console.log(`评论内容：${contents[i].text}`);
        console.log(`评论用户Id：${contents[i].user.id}`);
        console.log(`评论用户昵称：${contents[i].user.screen_name}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }

  mgdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].comment.replace(/\s/g, '')) {
        dataJson.p = 27;
        dataJson.id = contents[i].commentId;
        dataJson.name = contents[i].commentBy;
        console.log(`评论内容：${contents[i].comment}`);
        console.log(`评论用户Id：${contents[i].commentId}`);
        console.log(`评论用户昵称：${contents[i].commentBy}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  QQqzonedeal(contLength, userVal, contents, endPage, callback) {
    let dataJson = {}, content;
    for (let i = 0; i < contLength; i++) {
      content = contents[i].content.replace(/\[em\]([\(\^\w\^\)\w])*\[\/em\]/g, '');
      if (userVal == content.replace(/\s/g, '')) {
        dataJson.p = 29;
        dataJson.id = contents[i].uin;
        dataJson.name = contents[i].name;
        console.log(`评论内容：${content}`);
        console.log(`评论用户Id：${contents[i].uin}`);
        console.log(`评论用户昵称：${contents[i].name}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
                // logger.debug(content)
        endPage = false;
      }
            // logger.debug(content)
    }
    return endPage;
  }
  ucdeal(contLength, userVal, contents, callback) {
    const dataJson = {};
    for (const comment in contents) {
      if (userVal == contents[comment].content.replace(/\s/g, '')) {
        console.log(`评论内容：${contents[comment].content}`);
        console.log(`评论用户昵称：${contents[comment].user.nickname}`);
        dataJson.p = 26;
        dataJson.id = '暂时没有抓取到';
        dataJson.name = contents[comment].user.nickname;
        dataJson.endPage = true;
        callback(null, dataJson);
      }
      dataJson.endPage = false;
      dataJson.hotScore = contents[comment].hotScore;
    }
    return dataJson;
  }

  wsdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].text.replace(/\s/g, '')) {
        dataJson.p = 16;
        dataJson.id = contents[i].uid;
        dataJson.name = contents[i].name;
        console.log(`评论内容：${contents[i].text}`);
        console.log(`评论用户Id：${contents[i].uid}`);
        console.log(`评论用户昵称：${contents[i].name}`);

        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }

  nhdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].text.replace(/\s/g, '')) {
        dataJson.p = 19;
        dataJson.id = contents[i].user_id;
        dataJson.name = contents[i].user_name;
        console.log(`评论内容：${contents[i].text}`);
        console.log(`评论用户Id：${contents[i].user_id}`);
        console.log(`评论用户昵称：${contents[i].user_name}`);

        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  ku6deal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].commentContent.replace(/\s/g, '')) {
        dataJson.p = 14;
        dataJson.id = contents[i].commentAuthorId;
        dataJson.name = contents[i].commentAuthor;
        console.log(`评论内容：${contents[i].commentContent}`);
        console.log(`评论用户Id：${contents[i].commentAuthorId}`);
        if (contents[i].commentAuthor == null) {
          dataJson.name = contents[i].partner.p_username;
          console.log(`评论用户昵称：${contents[i].partner.p_username}`);
        } else {
          console.log(`评论用户昵称：${contents[i].commentAuthor}`);
        }
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  bmhdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 13;
        dataJson.id = contents[i].user.userID;
        dataJson.name = contents[i].user.nickName;
        console.log(`评论内容：${contents[i].content}`);
        console.log(`评论用户Id：${contents[i].user.userID}`);
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
  tddeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 12;
        dataJson.id = contents[i].userID;
        dataJson.name = contents[i].nickname;
        console.log(`评论内容：${contents[i].content}`);
        console.log(`评论用户Id：${contents[i].userID}`);
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
  ledeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 3;
        dataJson.id = contents[i].user.uid;
        dataJson.name = contents[i].user.username;
        console.log(`评论内容：${contents[i].content}`);
        console.log(`评论用户Id：${contents[i].user.uid}`);
        console.log(`评论用户昵称：${contents[i].user.username}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  kbdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 10;
        dataJson.id = contents[i].userinfo.userid;
        dataJson.name = contents[i].userinfo.nick;
        console.log(`用户评论：${contents[i].content}`);
        console.log(`评论用户Id：${contents[i].userinfo.userid}`);
        console.log(`评论用户昵称：${contents[i].userinfo.nick}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  ttdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].text.replace(/\s/g, '')) {
        dataJson.p = 6;
        dataJson.id = contents[i].user_id;
        dataJson.name = contents[i].user_name;
        console.log(`评论内容：${contents[i].text}`);
        console.log(`评论用户Id：${contents[i].user_id}`);
        console.log(`用户昵称：${contents[i].user_name}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  mpdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 5;
        dataJson.id = contents[i].user.id;
        dataJson.name = contents[i].user.screen_name;
        console.log(`评论内容：${contents[i].content}`);
        console.log(`评论用户Id：${contents[i].user.id}`);
        console.log(`用户昵称：${contents[i].user.screen_name}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
    }
    return endPage;
  }
  pptvdeal(contLength, userVal, contents, endPage, callback) {
    const dataJson = {};
    for (let i = 0; i < contLength; i++) {
      if (userVal == contents[i].content.replace(/\s/g, '')) {
        dataJson.p = 31;
        dataJson.id = contents[i].id;
        dataJson.name = contents[i].user.nick_name;
        console.log(`评论内容：${contents[i].content}`);
        console.log(`评论用户Id：${contents[i].id}`);
        console.log(`评论用户昵称：${contents[i].user.nick_name}`);
        endPage = true;
        callback(null, dataJson);
        break;
      } else {
        endPage = false;
      }
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
}
module.exports = DealWith;