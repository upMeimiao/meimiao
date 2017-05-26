const URL = require('url');
const cheerio = require('cheerio');
const request = require('../lib/req');
const r = require('request');

const jsonp = function (data) {
  return data;
};
const _Callback = function (data) {
  return data;
};

let logger, api;

class DealWith {
  constructor(core) {
    logger = core.settings.logger;
    api = core.settings.servantAPI;
    logger.debug('处理器实例化...');
  }
  youku(remote, callback) {
    const option = {
      url: `${api.youku.url}?client_id=${api.youku.key}&video_url=${encodeURIComponent(remote)}`
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 1 });
      }
      if (result.statusCode !== 200) {
        logger.error('优酷状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 1 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('优酷json数据解析失败');
        return callback(e, { code: 102, p: 1 });
      }
      const user = result.user;
      option.url = 'https://openapi.youku.com/v2/users/show.json';
      option.data = {
        client_id: 'c9e697e443715900',
        user_id: user.id
      };
      request.post(option, (err, info) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 1 });
        }
        if (info.statusCode !== 200) {
          logger.error('优酷状态码错误', info.statusCode);
          logger.info(info);
          return callback(true, { code: 102, p: 1 });
        }
        try {
          info = JSON.parse(info.body);
        } catch (e) {
          logger.error('优酷json数据解析失败');
          logger.info(info);
          return callback(e, { code: 102, p: 1 });
        }
        const res = {
          id: user.id,
          name: user.name,
          p: 1,
          encode_id: user.link.substring(user.link.lastIndexOf('/') + 1),
          avatar: info.avatar_large
        };
        callback(null, res);
      });
    });
  }
  bili(remote, callback) {
    let start = remote.indexOf('/av'),
      end = remote.indexOf('/', start + 1),
      id;
    if (end == -1) {
      id = remote.substring(start + 3);
    } else {
      id = remote.substring(start + 3, end);
    }
    const option = {
      url: api.bili.url + id
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 8 });
      }
      if (result.statusCode != 200) {
        logger.error('哔哩哔哩状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 8 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('哔哩哔哩json数据解析失败');
        return callback(e, { code: 102, p: 8 });
      }
      const res = {
        id: result.data.owner.mid,
        name: result.data.owner.name,
        avatar: result.data.owner.face,
        p: 8
      };
      callback(null, res);
    });
  }
  meipai(data, callback) {
    const pathname = URL.parse(data, true).pathname;
    let start = pathname.indexOf('/', 1),
      id = pathname.substring(start + 1);
    const option = {
      url: api.meipai.url + id
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 5 });
      }
      if (result.statusCode != 200) {
        logger.error('美拍状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 5 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('美拍json数据解析失败');

        return callback(e, { code: 102, p: 5 });
      }
      const res = {
        id: result.user.id,
        name: result.user.screen_name,
        avatar: result.user.avatar,
        p: 5
      };
      callback(null, res);
    });
  }
  miaopai(data, callback) {
    let urlObj = URL.parse(data, true),
      pathname = urlObj.pathname,
      hostname = urlObj.hostname;
    let start = pathname.lastIndexOf('/'),
      end = pathname.lastIndexOf('.'),
      id = pathname.substring(start + 1, end);
    if (hostname === 'm.miaopai.com') {
      id = pathname.substring(start + 1);
    }
    const option = {
      url: api.miaopai.url + id
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 7 });
      }
      if (result.statusCode != 200) {
        logger.error('秒拍状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 7 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('秒拍json数据解析失败');
        return callback(e, { code: 102, p: 7 });
      }
      const res = {
        id: result.result.ext.owner.suid,
        name: result.result.ext.owner.nick,
        avatar: result.result.ext.owner.icon,
        p: 7
      };
      callback(null, res);
    });
  }
  sohu(data, callback) {
    const pathname = URL.parse(data, true).pathname;
    let start = pathname.lastIndexOf('/'),
      end = pathname.lastIndexOf('.'),
      id = pathname.substring(start + 1, end);
    const option = {
      url: `${api.souhu.url + id}.json?site=2&api_key=695fe827ffeb7d74260a813025970bd5`
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 9 });
      }
      if (result.statusCode != 200) {
        logger.error('搜狐状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 9 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('搜狐json数据解析失败');
        return callback(e, { code: 102, p: 9 });
      }
            // logger.debug(result.data)
      const uid = result.data.user ? result.data.user.user_id : result.data.user_id;
      if (result.data.user) {
        const res = {
          id: uid,
          name: result.data.user.nickname,
          avatar: result.data.user.bg_pic,
          p: 9
        };
        return callback(null, res);
      }
      request.get({ url: `http://api.tv.sohu.com/v4/user/info/${uid}.json?api_key=f351515304020cad28c92f70f002261c&_=${(new Date()).getTime()}` }, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 9 });
        }
        if (result.statusCode != 200) {
          logger.error('搜狐状态码错误', result.statusCode);

          return callback(true, { code: 102, p: 9 });
        }
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.error('搜狐json数据解析失败');

          return callback(e, { code: 102, p: 9 });
        }
        const res = {
          id: uid,
          name: result.data.nickname,
          avatar: result.data.bg_pic,
          p: 9
        };
        return callback(null, res);
      });
    });
  }
  kuaibao(data, callback) {
    const pathname = URL.parse(data, true).pathname;
    let start = pathname.lastIndexOf('/'),
      id = pathname.substring(start + 1);
    const option = {
      url: api.kuaibao.url,
      data: {
        ids: id
      },
      referer: 'http://r.cnews.qq.com/inews/iphone/'
    };
    request.post(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 10 });
      }
      if (result.statusCode != 200) {
        logger.error('天天快报状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 10 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('天天快报json数据解析失败');

        return callback(e, { code: 102, p: 10 });
      }
      if (result.newslist.length == 0) { return callback(true, { code: 102, p: 10 }); }
      let back = result.newslist[0],
        res = {
          id: back.chlid,
          name: back.chlname,
          avatar: back.chlsicon,
          p: 10
        };
      callback(null, res);
    });
  }
  iqiyi(data, callback) {
    const option = {
      url: data,
      referer: `http://www.iqiyi.com${URL.parse(data).pathname}`
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 2 });
      }
      if (result.statusCode != 200) {
        logger.error('爱奇艺状态码错误1', result.statusCode);

        return callback(true, { code: 102, p: 2 });
      }
      let $ = cheerio.load(result.body),
        id = $('#flashbox').attr('data-player-tvid'),
        option = {
          url: `${api.iqiyi.url + id}?callback=jsonp&status=1`,
          host: 'mixer.video.iqiyi.com',
          referer: `http://www.iqiyi.com${URL.parse(data).pathname}`
        };
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 2 });
        }
        if (result.statusCode != 200) {
          logger.error('爱奇艺状态码错误2', result.statusCode);
          return callback(true, { code: 102, p: 2 });
        }
        let back = eval(result.body),
          res = {
            id: back.data.user.id,
            name: back.data.user.name,
            avatar: back.data.user.avatar,
            p: 2
          };
        if (Number(res.id) <= 100) {
          return callback(true, { code: 103, p: 2 });
        }
        callback(null, res);
      });
    });
  }
  le(data, callback) {
    const option = {
      url: data,
      referer: data
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 3 });
      }
      if (result.statusCode != 200) {
        logger.error('乐视状态码错误1', result.statusCode);
        return callback(true, { code: 102, p: 3 });
      }
      let $ = cheerio.load(result.body, {
          ignoreWhitespace: true
        }),
        _info_ = $('head script').text(),
        reg = new RegExp('userId:"[0-9]+"'),
        _info = _info_.match(reg), info, id, type;
      if (_info) {
        info = _info[0];
      } else {
        return callback(true);
      }
      id = info.substring(8, info.lastIndexOf('"'));
      const option = {
        url: `http://api.chuang.letv.com/outer/ugc/video/user/videocount?callback=jsonp&userid=${id}&_=${(new Date()).getTime()}`
      };
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(true, { code: 102, p: 3 });
        }
        result = eval(result.body);
        let data = result.data,
          name = data ? data.nickname : null,
          avatar = data ? data['pic300*300'] : null;
                // let _$ = cheerio.load(result.body),
                //     name = _$('.au_info .au_info_name').text()
        const res = {
          id,
          name,
          type: 1,
          avatar,
          p: 3
        };
        callback(null, res);
      });
    });
  }
  tencent(data, callback) {
    let urlObj = URL.parse(data, true),
      pathname = urlObj.pathname,
      query = urlObj.query,
      start = pathname.lastIndexOf('/'),
      end = pathname.indexOf('.html'),
      option = {}, res,
      vid = pathname.substring(start + 1, end);
    if (pathname.startsWith('/x/cover/')) {
      if (query.vid) {
        vid = query.vid;
      }
    }
    option.url = `${api.tencent.url + vid}&_=${new Date().getTime()}`;
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 4 });
      }
      if (result.statusCode !== 200) {
        logger.error('腾讯状态码错误1', result.statusCode);
        return callback(true, { code: 102, p: 4 });
      }
      const back = eval(result.body);
      if (!back.ugc || !back.vppinfo || !back.vppinfo.isvpp || back.result && (back.result.code == -200 || back.result.code == -12)) {
        option.url = data;
        request.get(option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            return callback(err, { code: 102, p: 4 });
          }
          if (result.statusCode !== 200) {
            logger.error('腾讯状态码错误2', result.statusCode);
            return callback(true, { code: 102, p: 4 });
          }
          let $ = cheerio.load(result.body),
            num = $('.btn_book .num');
          let user = $('.user_info'),
            href = user.attr('href'),
            idDom = $('.btn_book'),
            id = href.substring(href.lastIndexOf('/') + 1),
            name = $('div.video_user._video_user a.user_info span').text(),
            avatar = $('div.video_user._video_user a.user_info img').attr('src');
          if (name && avatar) {
            res = {
              id,
              name,
              avatar,
              p: 4
            };
            callback(null, res);
            return;
          }
          option.url = href;
          // logger.debug(option.url);
          request.get(option, (err, result) => {
            if (err) {
              logger.error('occur error : ', err);
              return callback(err, { code: 102, p: 4 });
            }
            if (result.statusCode !== 200) {
              logger.error('腾讯状态码错误3', result.statusCode);
              return callback(true, { code: 102, p: 4 });
            }
            let $ = cheerio.load(result.body),
              nameDom = $('h2.user_info_name'),
              nameDom2 = $('#userInfoNick');
            name = nameDom.text();
            avatar = $('#userAvatar').attr('src');
            if (nameDom.length === 0) {
              name = nameDom2.text();
              id = idDom.attr('r-subscribe');
            }
            if (!$('#userAvatar').attr('src')) {
              avatar = '';
            }
            res = {
              id,
              name,
              avatar,
              p: 4
            };
            callback(null, res);
            return;
          });
        });
      } else {
        // if(!back.vppinfo){
        //   callback(true, { code: 104, p: 4 })
        //   return;
        // }
        const nameIs = back.vppinfo.nick ? back.vppinfo.nick : back.vppinfo.nickdefault;
        if (nameIs && nameIs !== '' ) {
          res = {
            id: back.vppinfo.euin,
            name: nameIs,
            avatar: back.vppinfo.avatar ? (back.vppinfo.avatar.replace('/60', '/0')) : '',
            p: 4
          };
          return callback(null, res);
        }
        option.url = data;
        request.get(option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            return callback(err, { code: 102, p: 4 });
          }
          if (result.statusCode !== 200) {
            logger.error('腾讯状态码错误2', result.statusCode);
            return callback(true, { code: 102, p: 4 });
          }
          let $ = cheerio.load(result.body),
            num = $('.btn_book .num');
          let user = $('.user_info'),
            href = user.attr('href'),
            id = href.substring(href.lastIndexOf('/') + 1);
          option.url = href;
          request.get(option, (err, result) => {
            if (err) {
              logger.error('occur error : ', err);
              return callback(err, { code: 102, p: 4 });
            }
            if (result.statusCode !== 200) {
              logger.error('腾讯状态码错误3', result.statusCode);
              return callback(true, { code: 102, p: 4 });
            }
            const $ = cheerio.load(result.body),
              nameDom1 = $('h2.user_info_name'),
              nameDom2 = $('#userInfoNick');
            let name;
            if (nameDom1.length === 0) {
              name = nameDom2.text();
            } else {
              name = nameDom1.html();
            }
            res = {
              id,
              name,
              avatar: $('#userAvatar').attr('src') ? $('#userAvatar').attr('src') : '',
              p: 4
            };
            return callback(null, res);
          });
        });
      }
    });
  }
  toutiao(data, callback) {
    let pathname = URL.parse(data, true).pathname,
      v_id, option = {};
    if (pathname.startsWith('/i') || pathname.startsWith('/api/pc')) {
      if (pathname.startsWith('/api/pc')) {
        v_id = pathname.replace(/\//g, '').substring(9);
      } else if (pathname.startsWith('/item/')) {
        v_id = pathname.replace(/\//g, '').substring(4);
      } else {
        v_id = pathname.replace(/\//g, '').substring(1);
      }
      option.url = `${api.toutiao.url + v_id}/info/`;
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 6 });
        }
        if (result.statusCode != 200) {
          logger.error('头条状态码错误', result.statusCode);
          return callback(true, { code: 102, p: 6 });
        }
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.error('头条json数据解析失败');
          return callback(e, { code: 102, p: 6 });
        }
        request.get({ url: `http://lf.snssdk.com/2/user/profile/v3/?media_id=${result.data.media_user.id}` }, (err, resInfo) => {
          if (err) {
            logger.error('occur error : ', err);
            return callback(err, { code: 102, p: 6 });
          }
          if (resInfo.statusCode != 200) {
            logger.error('头条状态码错误', resInfo.statusCode);
            logger.info(resInfo);
            return callback(true, { code: 102, p: 6 });
          }
          try {
            resInfo = JSON.parse(resInfo.body);
          } catch (e) {
            logger.error('头条json数据解析失败');
            logger.info(resInfo);
            return callback(e, { code: 102, p: 6 });
          }
          const res = {
            id: result.data.media_user.id,
            name: result.data.media_user.screen_name,
            avatar: result.data.media_user.avatar_url,
            p: 6,
            encode_id: resInfo.data.user_id
          };
          callback(null, res);
        });
      });
    } else if (pathname.startsWith('/a') || pathname.startsWith('/group/')) {
      r.head(data, { headers: { 'User-Agent': ':Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1' } }, (err, res, body) => {
        v_id = (res.request.path).replace(/\//g, '').substring(1);
        option.url = `${api.toutiao.url + v_id}/info/`;
        request.get(option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            return callback(err, { code: 102, p: 6 });
          }
          if (result.statusCode != 200) {
            logger.error('头条状态码错误', result.statusCode);
            return callback(true, { code: 102, p: 6 });
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('头条json数据解析失败');

            return callback(e, { code: 102, p: 6 });
          }
          request.get({ url: `http://lf.snssdk.com/2/user/profile/v3/?media_id=${result.data.media_user.id}` }, (err, resInfo) => {
            if (err) {
              logger.error('occur error : ', err);
              return callback(err, { code: 102, p: 6 });
            }
            if (resInfo.statusCode != 200) {
              logger.error('头条状态码错误', resInfo.statusCode);
              logger.info(resInfo);
              return callback(true, { code: 102, p: 6 });
            }
            try {
              resInfo = JSON.parse(resInfo.body);
            } catch (e) {
              logger.error('头条json数据解析失败');
              logger.info(resInfo);
              return callback(e, { code: 102, p: 6 });
            }
            const res = {
              id: result.data.media_user.id,
              name: result.data.media_user.screen_name,
              avatar: result.data.media_user.avatar_url,
              p: 6,
              encode_id: resInfo.data.user_id
            };
            callback(null, res);
          });
        });
      });
    }
  }
  yidian(data, callback) {
    const option = {
      url: data
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 11 });
      }
      if (result.statusCode != 200) {
        logger.error('一点状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 11 });
      }
      let $ = cheerio.load(result.body),
        name = $('#source-name').text() || $('div.wemedia-wrapper a.wemedia-name').text(),
        href = $('#source-name').attr('href') || $('div.wemedia-wrapper a.wemedia-name').attr('href');
      if (!name || !href) {
        logger.error(`url可能不是播放页地址:${data}`);
        return callback(true, { code: 101, p: 11 });
      }
      let h_array = href.split('=').length <= 1 ? href.split('/') : href.split('='),
        v_id = h_array[h_array.length - 1],
        docid = $('.interact>span').eq(0).attr('data-docid'),
        res = {
          id: v_id,
          name,
          p: 11,
          avatar: docid || $('div.wemedia-wrapper a>img').attr('src')
        };
      if (!docid) {
        return callback(null, res);
      }
      this.yidianAvatar(docid, (err, result) => {
        if (err) {
          return callback(err, result);
        }
        res.avatar = result;
        callback(null, res);
      });
    });
  }
  yidianAvatar(docid, callback) {
    const option = {
      url: `https://a1.go2yd.com/Website/contents/content?appid=yidian&cv=4.3.8.1&distribution=com.apple.appstore&docid=${docid}&net=wifi&platform=0&recommend_audio=true&related_docs=true&version=020116`
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 11 });
      }
      if (result.statusCode != 200) {
        logger.error('一点状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 11 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('一点json数据解析失败');

        return callback(e, { code: 102, p: 11 });
      }
      if (!result.documents || !result.documents[0].related_wemedia) {
        return callback(null, '');
      }
      callback(null, result.documents[0].related_wemedia.media_pic);
    });
  }
  tudou(data, callback) {
    const htmlURL = URL.parse(data, true),
      option = {
       url: htmlURL
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('请求失败', err);
        callback(err, { code: 102, p: 12 });
        return;
      }
      if (result.statusCode != 200) {
        logger.error('请求状态码出错', result.statusCode);
        callback(`error ${result.statusCode}`, { code: 102, p: 12 });
        return;
      }
      const $ = cheerio.load(result.body),
        userInfo = $('div.td-play__userinfo'),
        encode_id = userInfo.find('.td-play__userinfo__meta a').attr('href').match(/\/i\/(\w*)/),
        name = userInfo.find('.td-play__userinfo__meta a').text(),
        avatar = userInfo.find('.td-play__userinfo__thumb-pic').attr('src');
      if (!userInfo || !encode_id) {
        callback('no-user', { code: 103, p: 12 });
        return;
      }
      const res = {
        encode_id: encode_id[1],
        name,
        avatar
      };
      this.getTudouBid(encode_id[1], (error, bid) => {
        if (error) {
          callback(error, { code: 102, p: 12 });
          return;
        }
        res.id = bid;
        callback(null, res);
      })
    });
  }

  getTudouBid(encode_id, callback) {
    const option = {
      url: `http://video.tudou.com/subscribe/check?uid=${encode_id}&_=${new Date().getTime()}`
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.debug('用户主页请求失败', err);
        this.getTudouBid(encode_id, callback);
        return;
      }
      if (result.statusCode != 200) {
        logger.debug('状态码错误', result.statusCode);
        callback(`user ${result.statusCode}`);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('粉丝数解析失败', result.body);
        callback(e);
        return;
      }
      callback(null, result.html.friend_id);
    })
  }

  baomihua(data, callback) {
    let urlObj = URL.parse(data, true),
      hostname = urlObj.hostname,
      pathname = urlObj.pathname,
      id, v_id, option = {};
    if (hostname == 'www.baomihua.com' || hostname == 'baomihua.com') {
      const v_array = pathname.split('/');
      if (pathname.indexOf('_')) {
        id = v_array[2].split('_')[0];
        v_id = v_array[2].split('_')[1];
      } else {
        id = v_array[2];
      }
    } else {
      const v_array = pathname.split('/');
      v_id = v_array[2];
    }
    if (id) {
      option.url = `${api.baomihua.url}?channelid=${id}&type=channelinfo`;
    } else {
      option.url = `${api.baomihua.url}?channelid=0&type=channelinfo&videoid=${v_id}`;
    }
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 13 });
      }
      if (result.statusCode != 200) {
        logger.error('爆米花状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 13 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('爆米花json数据解析失败');

        return callback(e, { code: 102, p: 13 });
      }

      const res = {
        id: result.result.ChannelInfo.ChannelID,
        name: result.result.ChannelInfo.ChannelName,
        avatar: result.result.ChannelInfo.MidPic,
        p: 13
      };
      callback(null, res);
    });
  }
  ku6(data, callback) {
    let v_array1 = data.split('/'),
      v_array2 = v_array1[v_array1.length - 1].split('.'),
      v_id = `${v_array2[0]}..`,
      v_time = new Date().getTime(),
      option = {
        url: `${api.ku6.url + v_id}&_=${v_time}`
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error:', err);
        return callback(err, { code: 102, p: 14 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('酷6json数据解析失败');
        return callback(e, { code: 102, p: 14 });
      }
      const avatar = result.data.list[0].author.icon.split(';')[0];
      const res = {
        id: result.data.list[0].author.id,
        name: result.data.list[0].author.nick,
        avatar,
        p: 14
      };
      callback(null, res);
    });
  }
  btime(data, callback) {
    let pathname = URL.parse(data, true).pathname,
      hostname = URL.parse(data, true).hostname,
      option = {};
    if (hostname == 'new.item.btime.com') {
      option.url = `http://api.btime.com/trans?fmt=json&news_from=4&news_id=${pathname.replace(/\//g, '')}`;
      return request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 15 });
        }
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.error('北京时间json数据解析失败');
          logger.info('json error: ', result.body);
          return callback(e, { code: 102, p: 15 });
        }
        const res = {
          id: result.data.author_uid,
          name: result.data.source,
          avatar: result.data.media.icon,
          p: 15
        };
        return callback(null, res);
      });
    }
    if (!((pathname.startsWith('/video/')) || (pathname.startsWith('/wemedia/')) || (pathname.startsWith('/wm/')) || (pathname.startsWith('/ent/') || (pathname.startsWith('/detail/'))))) {
      option.url = data;
      request.get(option, (err, result) => {
        if (err) {
          logger.debug('视频源码请求失败', err);
          return callback(err, { code: 103, p: 15 });
        }
        let $ = cheerio.load(result.body),
          bid = $('div.content-info .guanzhu').attr('data-cid'),
          name = $('div.content-info .cite a').text(),
          avatar = $('div.content-info .cite img').attr('src'),
          res;
        if (bid && name && avatar) {
          res = {
            id: bid,
            name,
            avatar,
            p: 15
          };
          return callback(null, res);
        }
        return callback(true, { code: 101, p: 15 });
      });
    }
    option.url = data;
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 15 });
      }
      if (result.statusCode != 200) {
        logger.error('北京时间状态码错误:', result.statusCode);

        return callback(true, { code: 102, p: 15 });
      }
      let $ = cheerio.load(result.body),
        id = $("input[name='uid']").attr('value'),
        option = {
          url: api.btime.url + id
        };
      if (!id) {
        let scriptDOM = $('script'),
          scriptText = scriptDOM[35].children[0].data,
          v_id = scriptText.replace('var video_id = "', '').replace('";', '');
        option.url = `http://api.btime.com/trans?fmt=json&news_from=4&news_id=${v_id}`;
        request.get(option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            return callback(err, { code: 102, p: 15 });
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('北京时间json数据解析失败');
            logger.info('json error: ', result.body);
            return callback(e, { code: 102, p: 15 });
          }
          const res = {
            id: result.data.author_uid,
            name: result.data.source,
            avatar: result.data.media.icon,
            p: 15
          };
          return callback(null, res);
        });
      } else {
        request.get(option, (err, result) => {
          if (err) {
            logger.error('occur error : ', err);
            return callback(err, { code: 102, p: 15 });
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('北京时间json数据解析失败');
            logger.info('json error: ', result.body);
            return callback(e, { code: 102, p: 15 });
          }

          const res = {
            id: result.data.uid,
            name: result.data.nickname,
            p: 15
          };
          return callback(null, res);
        });
      }
    });
  }
  weishi(data, callback) {
    let urlObj = URL.parse(data, true),
      hostname = urlObj.hostname,
      pathname = urlObj.pathname,
      id, v_id, option = {}, res = {};
    if (hostname.indexOf('qq') == -1) {
      v_id = pathname.split('/')[2];
      option.url = `${api.weishi.url_2}?id=${v_id}`;
      option.referer = `http://www.weishi.com/t/${v_id}`;
    } else if (pathname.includes('u')) {
      id = pathname.split('/')[2];
      option.url = `${api.weishi.url_1}?uid=${id}&_=${new Date().getTime()}`;
      option.referer = `http://weishi.qq.com/u/${id}`;
    } else {
      v_id = pathname.split('/')[2];
      option.url = `${api.weishi.url_2}?id=${v_id}`;
      option.referer = `http://weishi.qq.com/t/${v_id}`;
    }
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 16 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('微视json数据解析失败');
        logger.info('json error: ', result.body);
        return callback(e, { code: 102, p: 16 });
      }
      const data = result.data.user;
      res.name = Object.keys(data)[0];
      res.id = data[res.name];
      res.p = 16;
      this.weishiAvatar(res.id, (err, result) => {
        if (err) {
          return callback(err, result);
        }
        res.avatar = result;
        callback(null, res);
      });
    });
  }
  weishiAvatar(uid, callback) {
    const option = {
      url: `http://weishi.qq.com/u/${uid}`
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.debug('微视用户主页请求失败');
        return callback(err, { code: 102, p: 16 });
      }
      if (result.statusCode != 200) {
        logger.debug('微视用户主页状态码错误');
        return callback(true, { code: 102, p: 16 });
      }
      let $ = cheerio.load(result.body),
        avatar = $('#userpic').attr('src');
      if (!avatar) {
        return callback(null, '');
      }
      callback(null, avatar);
    });
  }
  xiaoying(data, callback) {
    let path = URL.parse(data, true).pathname,
      v_array = path.split('/'),
      id = v_array[2],
      option = {
        url: `${api.xiaoying.url + id}&_=${new Date().getTime()}`
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 17 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('小影json数据解析失败');
        logger.info('json error: ', result.body);
        return callback(e, { code: 102, p: 17 });
      }
      const res = {
        id: result.videoinfo.auid,
        name: result.videoinfo.username,
        avatar: result.videoinfo.userlogourl,
        p: 17
      };
      callback(null, res);
    });
  }
  budejie(data, callback) {
    let urlObj = URL.parse(data, true),
      hostname = urlObj.hostname,
      pathname = urlObj.pathname,
      id, v_id, option = {}, res = {};
    switch (hostname) {
      case 'www.budejie.com':
        if (pathname.indexOf('pc') !== -1) {
          let start = pathname.indexOf('/pc/'),
            end = pathname.indexOf('.');
          v_id = pathname.substring(start + 4, end);
          option.url = `http://www.budejie.com/detail-${v_id}.html`;
        } else if (pathname.indexOf('user') == -1) {
          let start = pathname.indexOf('-'),
            end = pathname.indexOf('.');
          v_id = pathname.substring(start + 1, end);
          option.url = `http://www.budejie.com/detail-${v_id}.html`;
        } else {
          let start = pathname.indexOf('-'),
            end = pathname.indexOf('.');
          id = pathname.substring(start + 1, end);
          option.url = api.budejie.url_1 + id;
        }
        break;
      case 'm.budejie.com':
        if (urlObj.query.pid) {
          v_id = urlObj.query.pid;
          option.url = `http://www.budejie.com/detail-${v_id}.html`;
        } else {
          let start = pathname.lastIndexOf('-'),
            end = pathname.indexOf('.');
          v_id = pathname.substring(start + 1, end);
          option.url = `http://www.budejie.com/detail-${v_id}.html`;
        }
        break;
      case 'a.f.budejie.com':
        let start = pathname.lastIndexOf('/'),
          end = pathname.indexOf('.');
        v_id = pathname.substring(start + 1, end);
        option.url = `http://www.budejie.com/detail-${v_id}.html`;
        break;
      default:
        return;
    }
    if (id) {
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 18 });
        }
        if (result.statusCode != 200) {
          logger.error('不得姐状态码错误1', result.statusCode);

          return callback(true, { code: 102, p: 18 });
        }
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.error('不得姐json数据解析失败');
          logger.info('json error: ', result);
          return callback(e, { code: 102, p: 18 });
        }
        const data = result.data;
        res.id = data.id;
        res.name = data.username;
        res.avatar = data.profile_image_large;
        res.p = 18;
        callback(null, res);
      });
    } else {
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 18 });
        }
        if (result.statusCode != 200) {
          logger.error('不得姐状态码错误2', result.statusCode);

          return callback(true, { code: 102, p: 18 });
        }
        let $ = cheerio.load(result.body),
          userNode = $('.u-user-name'),
          href = userNode.attr('href'),
          start = href.lastIndexOf('-'),
          end = href.indexOf('.'),
          avatar = $('img.u-logo').attr('src');
        res.id = href.substring(start + 1, end);
        res.name = userNode.text().trim();
        res.avatar = avatar;
        res.p = 18;
        callback(null, res);
      });
    }
  }
  neihan(data, callback) {
    let urlObj = URL.parse(data, true),
      hostname = urlObj.hostname,
      path = urlObj.pathname,
      v_array = path.split('/'),
      option = {}, id, v_id;
    if (hostname == 'm.neihanshequ.com') {
      id = path.includes('share') ? v_array[3] : v_array[2];
      option.url = `${api.neihan.url}p${id}`;
    } else if (hostname == 'neihanshequ.com' && path.startsWith('/p')) {
      const rex = new RegExp(/^p[1-9]\d*|0$/);
      if (rex.test(v_array[1])) {
        option.url = data;
      } else {
        return callback(true, { code: 101, p: 19 });
      }
    } else if (hostname == 'neihanshequ.com' && path.startsWith('/user/')) {
      id = v_array[2];
      option.url = data;
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error : ', err);
          return callback(err, { code: 102, p: 19 });
        }
        if (result.statusCode != 200) {
          logger.error('内涵段子状态码错误', result.statusCode);

          return callback(true, { code: 102, p: 19 });
        }
        let $ = cheerio.load(result.body, { ignoreWhitespace: true }),
          name = $('.desc-item .desc-wrapper .name').text(),
          avatar = $('.desc-item img.logo').attr('src');
        res = {
          name,
          id,
          avatar,
          p: 19
        };
        return callback(null, res);
      });
    } else {
      return callback(true, { code: 101, p: 19 });
    }
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        return callback(err, { code: 102, p: 19 });
      }
      if (result.statusCode != 200) {
        logger.error('内涵段子状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 19 });
      }
      let $ = cheerio.load(result.body),
        name = $('.name-time-wrapper .name').text(),
        href = $('.detail-wrapper .header a').attr('href');
      let hArr = href.split('/'),
        v_id = hArr[4],
        res = {
          name,
          id: v_id,
          avatar: $('#tmplNode img.user-img').attr('src'),
          p: 19
        };
      callback(null, res);
    });
  }
  yy(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      option = {};
    if (host == 'shenqu.3g.yy.com') {
      let v_array1 = path.split('/'),
        v_array2 = v_array1[v_array1.length - 1].split('_'),
        v_array3 = v_array2[1].split('.'),
        v_id = v_array3[0];
      option.url = api.yy.url_1 + v_id;
    } else if (host == 'w.3g.yy.com') {
      const q = URL.parse(data, true).query;
      option.url = q.resid ? api.yy.url_2 + q.resid : api.yy.url_3 + q.pid;
    } else if (host == 'www.yy.com') {
      if (path.startsWith('/x/') || path.startsWith('/s/') || path.startsWith('/d/')) {
        option.url = data;
      } else {
        return callback(true, { code: 101, p: 20 });
      }
    } else {
      logger.error('链接错误', data);
      return callback(true, { code: 101, p: 20 });
    }
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 20 });
      }
      if (result.statusCode != 200) {
        logger.error('yy状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 20 });
      }
      let $ = cheerio.load(result.body),
        name = $('.info-txt .nickname a').text(),
        href = $('.info-txt .nickname a').attr('href'),
        avatar = $('div.player-info>a.avatar>img').eq(0).attr('src'),
        h_array = href.split('/'),
        id = h_array[h_array.length - 1],
        res = {
          name,
          id,
          avatar,
          p: 20
        };
      callback(null, res);
    });
  }
  tv56(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      v_array = path.split('/'),
      pre_vid = v_array[2].replace('.html', ''),
      vid, id, res, name;
    switch (host) {
      case 'www.56.com':
        if (path.indexOf('play_album-aid') == -1) {
          vid = pre_vid.split('_')[1];
        } else {
          vid = pre_vid.split('_')[2].split('-')[1];
        }
        break;
      case 'm.56.com':
        vid = pre_vid.split('-')[1];
        break;
      default:
        return callback(true, { code: 101, p: 21 });
    }
    const options = {
      method: 'GET',
      url: `http://m.56.com/view/id-${vid}.html`,
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
      }
    };
    if (!vid) {
      vid = data.match(/\/c\/v\d*/).toString().replace('/c/', '');
      options.url = `http://m.56.com/c/${vid}.shtml`;
    }
    r(options, (err, res, body) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 21 });
      }
      if (res.statusCode != 200) {
        logger.error('56状态码错误', res.statusCode);
        return callback(true, { code: 102, p: 21 });
      }
            // body = body.replace(/[\s\n\r]/g,'');
      let $ = cheerio.load(body, {
          ignoreWhitespace: true
        }),
        scriptData = body.replace(/[\s\n\r]/g, ''),
        reg_id = new RegExp("sohu_user_id:'[0-9]+'"),
        _id_info = scriptData.match(reg_id), id_info,
        reg_name = new RegExp("user_name:'[A-Za-z0-9_\u4e00-\u9fa5]+'"),
        _name_info = scriptData.match(reg_name), name_info,
        dataJson = scriptData.replace(/[\s\n\r]/g, ''),
        startIndex = dataJson.indexOf('sohu_user_photo:'),
        endIndex = dataJson.indexOf(',ispgc'),
        avatar = dataJson.substring(startIndex + 16, endIndex),
        sohuVideoInfo;
      if (_id_info && _name_info) {
        id_info = _id_info[0];
        name_info = _name_info[0];
      } else {
        if (host == 'm.56.com') {
          id = body.match(/ugu: '\d*/).toString().replace("ugu: '", '');
          name = $('.dy-info h3').text();
          avatar = `http:${$('div.dy-avatar img').attr('src')}`;
          if (id && name) {
            res = {
              id,
              name,
              avatar,
              p: 21
            };
            return callback(null, res);
          }
        }
        options.url = data;
        options.headers = {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
        };
        options.method = 'GET';
        r(options, (error, response, body) => {
          if (error) {
            logger.debug('视频详情页请求失败', error);
            return callback(error, { code: 102, p: 21 });
          }
          sohuVideoInfo = body.replace(/[\s\n\r]/g, '').indexOf('sohuVideoInfo');
          if (sohuVideoInfo != -1) {
            const $ = cheerio.load(body);
            id = body.match(/pid: '\d*/).toString().replace("pid: '", '');
            name = $('.user_box a.user_cover').attr('title');
            avatar = $('.user_box a.user_cover img').attr('src');
            if (id && name) {
              res = {
                id,
                name,
                avatar,
                p: 21
              };
              return callback(null, res);
            }
            return callback(true, { code: 102, p: 21 });
          }
          return callback(true, { code: 103, p: 21 });
        });
        return;
      }
      id = id_info.substring(14, id_info.lastIndexOf("'"));
      name = name_info.substring(11, name_info.lastIndexOf("'"));
      res = {
        id,
        name,
        avatar,
        p: 21
      };
      callback(null, res);
    });
  }
  acfun(data, callback) {
    let host = URL.parse(data, true).hostname,
      option = {},
      v_id;
    if (host == 'www.acfun.tv' || host == 'www.acfun.cn') {
      const v_array = URL.parse(data, true).pathname.split('ac');
      v_id = v_array[1];
    } else {
      v_id = URL.parse(data, true).query.ac;
    }
    option.url = api.acfun.url + v_id;
    option.deviceType = '0';
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 22 });
      }
      if (result.statusCode != 200) {
        logger.error('A站状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 22 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('A站json数据解析失败');
        logger.info('json error: ', result);
        return callback(e, { code: 102, p: 22 });
      }
      const res = {
        name: result.data.owner.name,
        id: result.data.owner.id,
        avatar: result.data.owner.avatar,
        p: 22
      };
      callback(null, res);
    });
  }
  weibo(remote, callback) {
    let urlObj = URL.parse(remote, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      bid = path.match(/\/\d*/).toString().replace(/\//g, ''),
      option = {},
      v_id;
    if (bid == '') {
      bid = path.match(/status\/\d*/).toString().replace(/status\//, '');
    }
    if (bid.length > 10) {
      option.url = remote;
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error: ', err);
          return callback(err, { code: 102, p: 23 });
        }
        if (result.statusCode != 200) {
          logger.error('weibo状态码错误', result.statusCode);

          return callback(true, { code: 102, p: 23 });
        }
        let $ = cheerio.load(result.body),
          script;
        try {
          script = $('script')[1].children[0].data.replace(/[\s\n\r]/g, '');
          bid = script.match(/"user":\{"id":\d*/).toString().replace(/"user":\{"id":/, '');
        } catch (e) {
          this.weibo(remote, callback);
          return;
        }

        option.url = `http://m.weibo.cn/container/getIndex?sudaref=m.weibo.cn&retcode=6102&type=uid&value=${bid}`;
        this.getRes(option, callback);
      });
    } else {
      option.url = `http://m.weibo.cn/container/getIndex?sudaref=m.weibo.cn&retcode=6102&type=uid&value=${bid}`;
      this.getRes(option, callback);
    }
  }
  getRes(option, callback) {
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 23 });
      }
      if (result.statusCode != 200) {
        logger.error('weibo状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 23 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('weibo数据解析失败');
        return callback(e, { code: 102, p: 23 });
      }
      const res = {
        name: result.userInfo.screen_name,
        id: result.userInfo.id,
        avatar: result.userInfo.profile_image_url,
        p: 23
      };
      callback(null, res);
    });
  }
  ifeng(remote, callback) {
    let urlObj = URL.parse(remote, true),
      host = urlObj.host,
      option = {},
      v_id;
    if (host == 'vcis.ifeng.com' || host == 'share.iclient.ifeng.com') {
      v_id = urlObj.query.guid;
      option.url = `${api.ifeng.url}${v_id}&adapterNo=7.1.0&protocol=1.0.0`;
      this.ifengUser(option, (err, result) => {
        if (err) {
          return callback(err, result);
        }
        callback(null, result);
      });
    } else if (host == 'v.ifeng.com') {
      option.url = remote;
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error: ', err);
          return callback(err, { code: 102, p: 24 });
        }
        result = result.body.replace(/[\s\n\r]/g, '');
        const guid = result.match(/\"vid\":\"[\d\w-]*/).toString().replace('"vid":"', '');
        option.url = `${api.ifeng.url}${guid}&adapterNo=7.1.0&protocol=1.0.0`;
        this.ifengUser(option, (err, result) => {
          if (err) {
            return callback(err, result);
          }
          callback(null, result);
        });
      });
    }
  }
  ifengUser(option, callback) {
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 24 });
      }
      if (result.statusCode != 200) {
        logger.error('凤凰状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 24 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('凤凰json数据解析失败');
        logger.info('json error: ', result);
        return callback(e, { code: 102, p: 24 });
      }
      const res = {
        name: result.weMedia.name,
        id: result.weMedia.id,
        avatar: result.weMedia.headPic,
        p: 24
      };
      logger.debug(res);
      callback(null, res);
    });
  }
  wangyi(remote, callback) {
    let host = URL.parse(remote, true).hostname,
      dataUrl = remote.match(/\/\w*\.html/).toString().replace(/\//, '').replace(/\.html/, ''),
      option = {
        url: `http://c.m.163.com/nc/video/detail/${dataUrl}.html`
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 25 });
      }
      if (result.statusCode != 200) {
        logger.error('网易状态码错误', result.statusCode);
        logger.error(result);
        return callback(true, { code: 102, p: 25 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('网易数据解析失败');
        return callback(e, { code: 102, p: 25 });
      }
      const res = {
        name: result.videoTopic.tname,
        id: result.videoTopic.tid,
        avatar: result.topicImg,
        p: 25
      };
            // logger.debug(res.name)
      callback(null, res);
    });
  }
  uctt(remote, callback) {
    let host = URL.parse(remote, true).hostname,
      option = {
        url: remote
      },
      bid = '', aid = '', options = {};
    if (host == 'v.mp.uc.cn' || host == 'a.mp.uc.cn') {
      bid = remote.match(/wm_id=\w*/).toString().replace(/wm_id=/, '');
      options.url = `http://napi.uc.cn/3/classes/article/categories/wemedia/lists/${bid}?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_size=5&_max_pos=&uc_param_str=frdnsnpfvecpntnwprdsssnikt`;
      request.get(options, (err, info) => {
        if (err) {
          logger.error('occur error: ', err);
          return callback(err, { code: 102, p: 26 });
        }
        try {
          info = JSON.parse(info.body);
        } catch (e) {
          logger.debug('UC数据解析失败');
          return callback(e, { code: 102, p: 26 });
        }
        const res = {
          name: info.data[0].wm_name,
          id: bid,
          avatar: info.data[0].avatar_url,
          p: 26
        };
        callback(null, res);
      });
    } else {
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error: ', err);
          return callback(err, { code: 102, p: 26 });
        }
        if (result.statusCode != 200) {
          logger.error('UC状态码错误', result.statusCode);

          return callback(true, { code: 102, p: 26 });
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
                    /* 不是认证用户*/
          callback(null, { code: 103, p: 26 });
        } else {
          options.url = `http://napi.uc.cn/3/classes/article/categories/wemedia/lists/${bid}?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_size=5&_max_pos=&uc_param_str=frdnsnpfvecpntnwprdsssnikt`;
          request.get(options, (err, info) => {
            if (err) {
              logger.error('occur error: ', err);
              return callback(err, { code: 102, p: 26 });
            }
            try {
              info = JSON.parse(info.body);
            } catch (e) {
              logger.debug('UC数据解析失败');
              return callback(e, { code: 102, p: 26 });
            }
            const res = {
              name: info.data[0].wm_name,
              id: bid,
              avatar: info.data[0].avatar_url,
              p: 26
            };
            callback(null, res);
          });
        }
      });
    }
  }
  mgtv(remote, callback) {
    let host = URL.parse(remote, true).hostname,
      bid = '',
      index = 0,
      option = {};
    if (host == 'www.mgtv.com') {
      bid = remote.match(/b\/\d*/).toString().replace(/b\//, '');
    } else {
      bid = remote.match(/b\/\d*/).toString().replace(/b\//, '');
    }
    option.url = `http://pcweb.api.mgtv.com/variety/showlist?collection_id=${bid}`;
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 27 });
      }
      if (result.statusCode != 200) {
        logger.error('芒果TV状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 27 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('芒果TV数据解析失败');
        return callback(e, { code: 102, p: 27 });
      }
      index = result.data.info.title.indexOf(' ');
      index = index == -1 ? result.data.info.title.length : index;
      this.mgtvAvatar(bid, (err, avatar) => {
        if (err) {
          return callback(err, avatar);
        }
        const res = {
          name: result.data.info.title.substring(0, index),
          id: result.data.tab_y[0].id,
          avatar,
          p: 27
        };
        callback(null, res);
      });
    });
  }
  mgtvAvatar(bid, callback) {
    const option = {
      url: `http://www.mgtv.com/h/${bid}.html?fpa=se`
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.debug('芒果TV avatar 请求失败');
        return this.mgtvAvatar(bid, callback);
      }
      if (result.statusCode != 200) {
        logger.error('芒果TV状态码错误', result.statusCode);
        return this.mgtvAvatar(bid, callback);
      }
      let $ = cheerio.load(result.body),
        avatar = $('a.banner>img').attr('src');
      if (!avatar) {
        return callback(null, '');
      }
      callback(null, avatar);
    });
  }
  qzone(remote, callback) {
    let query = URL.parse(remote, true).query,
      host = URL.parse(remote, true).hostname,
      uin = '',
      tid = '',
      option = {};
    if (host == 'user.qzone.qq.com') {
      uin = remote.match(/com\/\d*/).toString().replace(/com\//, '');
      tid = remote.match(/mood\/\w*/).toString().replace(/mood\//, '');
      option.url = `${api.qzone.url}&uin=${uin}&tid=${tid}`;
      this.getQzone(option, callback);
    } else if (host == 'mobile.qzone.qq.com') {
      if (remote.match(/&u=\d*/) == null) {
        uin = query.res_uin;
        tid = query.cellid;
      } else {
        uin = query.u;
        tid = query.i;
      }
      option.url = `${api.qzone.url}&uin=${uin}&tid=${tid}`;
      this.getQzone(option, callback);
    } else if (host == 'h5.qzone.qq.com') {
      uin = query.uin;
      tid = query.shoushou_id;
      option.url = `${api.qzone.url}&uin=${uin}&tid=${tid}`;
      this.getQzone(option, callback);
    } else {
      option.url = remote;
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error: ', err);
          return callback(err, { code: 102, p: 29 });
        }
        if (result.statusCode != 200) {
          logger.error('网易状态码错误', result.statusCode);

          return callback(true, { code: 102, p: 29 });
        }
        let $ = cheerio.load(result.body),
          script = $('script')[13].children[0].data,
          data = script.match(/"uin":"\d*","_wv":"\d*","_ws":"\d*","adtag":"\w*","is_video":"\w*","shuoshuo_id":"\w*","data/).toString().replace(/"uin/, '{"uin').replace(/,"data/, '}');
        try {
          data = JSON.parse(data);
        } catch (e) {
          logger.debug('QQ空间bid请求参数解析失败');
          return callback(e, { code: 102, p: 29 });
        }
        option.url = `${api.qzone.url}&uin=${data.uin}&tid=${data.shuoshuo_id}`;
        this.getQzone(option, callback);
      });
    }
  }
  getQzone(option, callback) {
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 29 });
      }
      if (result.statusCode != 200) {
        logger.error('QQ空间状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 29 });
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('QQ空间数据解析失败');
        return callback(e, { code: 102, p: 29 });
      }
      if (!result.usrinfo) {
        return callback(null, { code: 103, p: 29 });
      }
      const res = {
        name: result.usrinfo.name,
        id: result.usrinfo.uin,
        avatar: `https://qlogo4.store.qq.com/qzone/${result.usrinfo.uin}/${result.usrinfo.uin}/100?`,
        p: 29
      };
      callback(null, res);
    });
  }
  cctv(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      bid = '',
      name = '',
      avatar = '',
      option = {
        url: data
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 30 });
      }
      if (result.statusCode != 200) {
        logger.error('CCTV状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 30 });
      }
      const $ = cheerio.load(result.body);
      bid = $('#userName a').attr('href').match(/\d*\/index/).toString().replace(/\/index/, '');
      name = $('#userName a').text();
      avatar = $('.user_pic').attr('src');
      if (!bid && !name && !avatar) {
        return callback(null, { code: 103, p: 30 });
      }
      const res = {
        p: 30,
        id: bid,
        name,
        avatar
      };
      callback(null, res);
    });
  }
  pptv(data, callback) {
    let vid = data.match(/show\/\w*\.html/).toString().replace(/show\//, ''),
      option = {
        url: data,
        referer: `http://v.pptv.com/page/${vid}`
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 31 });
      }
      if (result.statusCode != 200) {
        logger.error('PPTV状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 31 });
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      const vid = result.match(/varwebcfg={"id":\d+/).toString().replace('varwebcfg={"id":', '');
      return this.pptvInfo(vid, data, (err, result) => {
        callback(null, result);
      });
    });
  }
  pptvInfo(vid, url, callback) {
    const option = {
      url: `http://epg.api.pptv.com/detail.api?auth=1&format=jsonp&cb=jsonp&vid=${vid}&_=${new Date().getTime()}`
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 31 });
      }
      if (result.statusCode != 200) {
        logger.error('PPTV状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 31 });
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('PPTV数据解析失败');
        return callback(e, { code: 102, p: 31 });
      }
      const dataName = result;
      if (!result.v.traceName) {
        option.url = url;
        request.get(option, (err, result) => {
          if (err) {
            logger.error('occur error: ', err);
            return callback(err, { code: 102, p: 31 });
          }
          if (result.statusCode != 200) {
            logger.error('PPTV状态码错误', result.statusCode);
            return callback(true, { code: 102, p: 31 });
          }
          let $ = cheerio.load(result.body),
            script = $('script')[2].children[0].data.replace(/[\s\n\r]/g, ''),
            dataJson = script.replace(/varwebcfg=/, '').replace(/;/, '');
          try {
            dataJson = JSON.parse(dataJson);
          } catch (e) {
            logger.debug(dataJson);
            return;
          }
          if (!dataJson.p_title.replace(/[\s\n\r]/g, '')) {
            return this.pptvInfo(vid, url, callback);
          }
          const res = {
            name: dataJson.p_title,
            id: dataJson.pid,
            p: 31,
            encode_id: dataJson.cat_id,
            avatar: dataName.v.imgurl
          };
          return callback(null, res);
        });
      } else {
        const res = {
          name: result.v.traceName,
          id: result.v.traceId,
          p: 31,
          encode_id: result.v.type,
          avatar: result.v.imgurl
        };
        callback(null, res);
      }
    });
  }
  xinlan(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      option = {
        url: data
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 32 });
      }
      if (result.statusCode != 200) {
        logger.error('新蓝网状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 32 });
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      const res = {
        name: result.match(/pTitle:"[^\x00-\xff]*/).toString().replace(/pTitle:"/, ''),
        id: result.match(/pid:\d*/).toString().replace(/pid:/, ''),
        p: 32,
        encode_id: result.match(/cid:\d*/).toString().replace(/cid:/, '')
      };
      this.xinlanAvatar(res.name, (err, result) => {
        res.avatar = result;
        callback(null, res);
      });
    });
  }
  xinlanAvatar(name, callback) {
    const option = {
      url: `http://so.cztv.com/pc/s?wd=${encodeURIComponent(name)}`
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.debug('头图的搜索列表请求失败');
        return this.xinlanAvatar(name, callback);
      }
      if (result.statusCode != 200) {
        logger.error('新蓝网状态码错误', result.statusCode);
        return this.xinlanAvatar(name, callback);
      }
      let $ = cheerio.load(result.body),
        avatars = $('div.ui-search-results');
      if (avatars.length <= 0) {
        return callback(null, '');
      }
      for (let i = 0; i < avatars.length; i++) {
        let bname = avatars.eq(i).find('li.ui-cf div.ui-fl>img').attr('title'),
          avatar = avatars.eq(i).find('li.ui-cf div.ui-fl>img').attr('src');
        logger.debug(name);
        if (name === bname) {
          return callback(null, avatar);
        }
      }
      callback(null, '');
    });
  }
  v1(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      bid = '',
      name = '',
      vid = '',
      option = {
        url: data
      };
    vid = path.match(/\d*\./).toString().replace(/[\.]/g, '');
    option.url = `http://static.app.m.v1.cn/www/mod/mob/ctl/videoDetails/act/get/vid/${vid}/pcode/010210000/version/4.5.4.mindex.html`;
    request.get(option, (err, result) => {
      if (err) {
        logger.error('occur error: ', err);
        return callback(err, { code: 102, p: 33 });
      }
      if (result.statusCode != 200) {
        logger.error('v1状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 33 });
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('v1数据转换失败');
        return callback(e, { code: 102, p: 33 });
      }
      this.getenCodeid(data, (err, encodeid) => {
        const res = {
          p: 33,
          id: result.body.obj.videoDetail.userInfo.userId,
          name: result.body.obj.videoDetail.userInfo.userName,
          avatar: result.body.obj.videoDetail.userInfo.userImg,
          encode_id: encodeid
        };
        callback(null, res);
      });
    });
  }
  getenCodeid(url, callback) {
    const option = {
      url
    };
    request.get(option, (err, result) => {
      if (err) {
        logger.debug('v1 encodeid 请求失败');
        return this.getenCodeid(url, callback);
      }
      if (result.statusCode != 200) {
        logger.debug('v1 encodeid 状态码错误');
        return this.getenCodeid(url, callback);
      }
      let $ = cheerio.load(result.body),
        encodeid = $('a.btn_alSub').attr('id').replace('isfocusbtn_', '');
      callback(null, encodeid);
    });
  }
  fengxing(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      bid = '',
      encode_id = '',
      name = '',
      option = {
        url: data
      };
    if (host == 'pm.funshion.com' || host == 'm.fun.tv') {
      if (urlObj.query.mid == undefined) {
        callback(null, { id: '', name: '', p: 34 });
        return;
      }
      bid = urlObj.query.mid;
    } else if (path.match(/g-\d*/) == null) {
      if (!path.match(/c-(\d*)/)) {
        callback('error', { code: 103, p: 34 });
        return;
      }
      bid = path.match(/c-(\d*)/)[1];
      option.url = `http://www.fun.tv/channel/lists/${bid}/`;
      this.getfengxiang('视频号', option, callback);
    } else {
      bid = path.match(/g-\d*/).toString().replace('g-', '');
      option.url = `http://pm.funshion.com/v5/media/profile?cl=iphone&id=${bid}&si=0&uc=202&ve=3.2.9.2`;
      this.getfengxiang('', option, callback);
    }
  }
  getfengxiang(video, option, callback) {
    if (video == '视频号') {
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error: ', err);
          return callback(err, { code: 102, p: 34 });
        }
        let $ = cheerio.load(result.body),
          bid = $('div.ch-info div.info a').attr('data-id'),
          name = $('div.ch-info div.info h1').text(),
          avatar = $('div.chan-head-ico>img').attr('src');
        const res = {
          id: bid,
          name,
          avatar: avatar || '',
          p: 34
        };
        callback(null, res);
      });
    } else {
      request.get(option, (err, result) => {
        if (err) {
          logger.error('occur error: ', err);
          return callback(err, { code: 102, p: 34 });
        }
        if (result.statusCode != 200) {
          logger.error('风行状态码错误', result.statusCode);

          return callback(true, { code: 102, p: 34 });
        }
        try {
          result = JSON.parse(result.body);
        } catch (e) {
          logger.debug('风行数据转换失败');
          return callback(e, { code: 102, p: 34 });
        }
        const res = {
          p: 34,
          id: result.id,
          name: result.name,
          avatar: result.poster
        };
        callback(null, res);
      });
    }
  }
  huashu(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      bid = path.match(/id\/\d*/).toString().replace(/id\//, ''),
      name = '',
      option = {
        url: `http://www.wasu.cn/Play/show/id/${bid}`
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.error('视频详情: ', err);
        return callback(err, { code: 102, p: 35 });
      }
      if (result.statusCode != 200) {
        logger.error('视频详情状态码错误', result.statusCode);

        return callback(true, { code: 102, p: 35 });
      }
      const $ = cheerio.load(result.body);
      option.url = $('div.play_information_t').eq(0).find(' div.r div.one a').attr('href');
      request.get(option, (err, result) => {
        if (err) {
          logger.error('专辑信息: ', err);
          return callback(err, { code: 102, p: 35 });
        }
        if (result.statusCode != 200) {
          logger.error('专辑信息状态码错误', result.statusCode);

          return callback(true, { code: 102, p: 35 });
        }
        let $ = cheerio.load(result.body),
          script = $('script')[8].children[0].data,
          bid = script.match(/aggvod\/id\/\d*/).toString().replace('aggvod/id/', ''),
          name = $('span.movie_name').text(),
          avatar = $('div.img_box>img').attr('src'),
          res = {
            id: bid,
            name,
            avatar,
            p: 35
          };
        callback(null, res);
      });
    });
  }
  baofeng(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      bid = path.match(/play-\d*/).toString().replace('play-', ''),
      listId = null,
      encode_id = '',
      name = '',
      option = {
        url: data
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.debug('暴风PC请求失败', err);
        return callback(err, { code: 102, p: 36 });
      }
      if (result.statusCode != 200) {
        logger.debug('暴风PC状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 36 });
      }
      try {
        let $ = cheerio.load(result.body),
          script = $('script')[16].children[0].data.replace(/[\s\n\r]/g, ''),
          startIndex = script.indexOf('{"info_box_tpl"'),
          endIndex = script.indexOf(';varstatic_storm_json');
        result = JSON.parse(script.substring(startIndex, endIndex));
      } catch (e) {
        logger.debug('数据解析失败');
        return callback(true, { code: 102, p: 36 });
      }
      const res = {
        id: bid,
        name: result.info_name,
        avatar: result.info_img,
        p: 36
      };
      callback(null, res);
    });
  }
  baidu(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      name = '',
      startIndex = null,
      endIndex = null,
      option = {
        url: data
      };
    if (host == 'baidu.56.com' || host == 'baishi.pgc.baidu.com') {
      const video = path.match(/\d*\.html/).toString();
      option.url = `http://baishi.baidu.com/watch/${video}`;
    }
    request.get(option, (err, result) => {
      if (err) {
        callback(err, { code: 102, p: 37 });
        return;
      }
      if (result.statusCode != 200) {
        callback(result.statusCode, { code: 102, p: 37 });
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      startIndex = result.indexOf("{pgcName:'");
      endIndex = result.indexOf("',pgcTid:'");
      if (startIndex === -1 || endIndex === -1) {
        callback('no-name');
        return;
      }
      name = result.substring(startIndex + 10, endIndex);
      this.baiduAvatar(name, (error, res) => {
        if (error) {
          callback(error, {code: 102, p: 37});
          return;
        }
        callback(null, res);
      });
    });
  }
  baiduAvatar(bname, callback) {
    const option = {
      url: `http://v.baidu.com/tagapi?type=2&tag=${encodeURIComponent(bname)}&_=${new Date().getTime()}`
    };
    request.get(option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      if (result.statusCode != 200) {
        callback(result.statusCode);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        callback('baidu-user-json-error');
        return;
      }
      if (!result.data[0].tag_info) {
        callback('error');
        return;
      }
      const res = {
        id: result.data[0].tag_info.id,
        name: result.data[0].tag_info.title,
        avatar: result.data[0].tag_info.imgurl,
        p: 37
      };
      callback(null, res);
    });
  }
  baijia(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      path = urlObj.pathname,
      bid = null,
      name = '',
      option = {
        url: data
      };
    request.get(option, (err, result) => {
      if (err) {
        logger.debug('百度百家视频请求失败', err);
        return callback(err, { code: 102, p: 28 });
      }
      if (result.statusCode != 200) {
        logger.debug('百度百家的状态码错误', result.statusCode);
        return callback(true, { code: 102, p: 28 });
      }
      const $ = cheerio.load(result.body);
      result = result.body.replace(/[\n\r\s]/g, '');
      let startIndex = result.indexOf('videoData'),
        endIndex = result.indexOf(';window.listInitData'),
        dataJson = result.substring(startIndex + 10, endIndex);
      if (startIndex === -1 || endIndex === -1) {
        startIndex = result.indexOf('videoData={tplData:');
        endIndex = result.indexOf(',userInfo:');
        dataJson = result.substring(startIndex + 19, endIndex);
      }
      if (!$('script')[11].children[0] && !$('script')[12].children[0]) {
        dataJson = result.substring(startIndex + 19, endIndex);
      }
      if (host == 'sv.baidu.com') {
        let bid = $('div.c-gap-top-large.author div.follow').attr('data-appid'),
          name = $('div.c-gap-top-large.author div.detail>a').text(),
          avatar = $('div.c-gap-top-large.author img.face').attr('src'),
          res = {
            id: bid,
            name,
            avatar,
            p: 28
          };
        return callback(null, res);
      }
      try {
        dataJson = JSON.parse(dataJson);
      } catch (e) {
        logger.debug('百家号用户数据解析失败');
        logger.info(dataJson);
        return callback(true, { code: 102, p: 28 });
      }
      const res = {
        id: dataJson.app.id,
        name: dataJson.app.name,
        avatar: dataJson.app.avatar,
        p: 28
      };
      callback(null, res);
    });
  }
  liVideo(data, callback) {
    let vid = null,
      name = '',
      options = {
        method: 'GET',
        qs: { contId: '' },
        headers:
        { // 'postman-token': 'c35cb432-4cb4-b3ce-bf2f-8b16e134b7f4',
          'cache-control': 'no-cache',
          'x-platform-version': '10.2.1',
          'x-client-hash': 'b90e74ec3b4e9511e9cf87e96438e461',
          connection: 'keep-alive',
          'x-client-version': '2.2.1',
          'x-client-agent': 'APPLE_iPhone8,2_iOS10.2.1',
          'user-agent': 'LiVideoIOS/2.2.1 (iPhone; iOS 10.2.1; Scale/3.00)',
          'X-Platform-Type': '1',
          'X-Client-ID': '2C2DECE9-B2CD-4B8B-A044-6D904ACFB5E7',
                        //'X-Channel-Code': 'official',
                        //'X-Serial-Num': '1489717814'
        }
      };
    if (data.includes('video_')) {
      vid = data.match(/video_\d*/).toString().replace('video_', '');
    } else {
      vid = data.match(/detail_\d*/).toString().replace('detail_', '');
    }
    options.qs.contId = vid;
    options.url = `http://app.pearvideo.com/clt/jsp/v2/content.jsp?contId=${vid}`;
    r(options, (error, response, body) => {
      if (error) {
        logger.debug('梨视频单个视频信息请求失败', err);
        return this.liVideo(data, callback);
      }
      if (response.statusCode != 200) {
        logger.debug('梨视频状态码错误', response.statusCode);
        return callback(true, { code: 102, p: 38 });
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('梨视频数据解析失败');
        logger.debug(body);
        return callback(e, { code: 102, p: 38 });
      }
      const res = {
        id: body.content.nodeInfo.nodeId,
        name: body.content.nodeInfo.name,
        avatar: body.content.nodeInfo.logoImg,
        p: 38
      };
      callback(null, res);
    });
  }
    // xiangkan ( data, callback ){
    //     let vid = data.match(/videoId=\w*/).toString().replace(/videoId=/,''),
    //         option = {
    //             url: `http://api.xk.miui.com/front/video/${vid}?d=270010343`
    //         };
    //         request.get(option, (err, result) => {
    //             if(err){
    //                 logger.debug('想看视频请求错误',err);
    //                 return callback(err,{code:103,p:39});
    //             }
    //             if(result.statusCode != 200){
    //                 logger.debug('请求的状态码有误',result.statusCode);
    //                 return callback(true,{code:103,p:39})
    //             }
    //             try{
    //                 result = JSON.parse(result.body)
    //             }catch (e){
    //                 logger.debug('数据解析失败');
    //                 logger.info(result.body);
    //                 return callback(e,{code:103,p:39})
    //             }
    //             let res = {
    //                 id: result.data.videoInfo.authorInfo.uid,
    //                 name: result.data.videoInfo.authorInfo.nickname,
    //                 p: 39,
    //                 avatar: result.data.videoInfo.authorInfo.headurl
    //             }
    //             callback(null,res)
    //         })
    // }
  youtube(remote, callback) {
    let urlObj = URL.parse(remote, true),
      pathname = urlObj.pathname;
    if (pathname !== '/watch') {
      return callback(err, { code: 101, p: 39 });
    }
    let vid = urlObj.query.v,
      options = {
        method: 'GET',
        url: `https://www.youtube.com/watch?v=${vid}`,
            // proxy: 'http://127.0.0.1:56428',
            // tunnel: true,
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.110 Safari/537.36'
        }
      };
        // logger.debug(options)
    r(options, (error, response, body) => {
      if (error) {
        return callback(err, { code: 102, p: 39 });
      }
      if (response.statusCode !== 200) {
        return callback(err, { code: 102, p: 39 });
      }
            // logger.debug(body)
      let $ = cheerio.load(body),
        $id = $('.yt-user-info a'),
        $avatar = $('.yt-thumb-clip img'),
        id = $id.attr('data-ytid'),
        name = $id.text(),
        avatar = $avatar.attr('data-thumb'),
        res = { id, name, avatar, p: 39 };
      logger.debug(res);
      callback(null, res);
    });
  }
  facebook(data, callback) {
    let urlObj = URL.parse(data, true),
      pathname = urlObj.pathname,
      query = urlObj.query,
      aid = null,
      option = {
        // ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        referer: `https://www.facebook.com/pg/${pathname.split('/')[1]}/videos/?ref=page_internal`,
        // proxy: 'http://127.0.0.1:56777'
      },
      res, bid, name, avatar, $;
    if (query.type) {
      bid = pathname.split('/')[1];
      aid = pathname.split('/')[4];
    } else if (/\d+/.test(pathname.split('/')[3])) {
      bid = pathname.split('/')[1];
      aid = pathname.split('/')[3];
    } else if (pathname.split('/')[3] === 'videos') {
      option.url = data;
      option.referer = 'https://www.facebook.com';
      request.get(option, (err, result) => {
        if (err) {
          logger.debug('facebook视频列表页请求失败', err);
          callback(err, { code: 102, p: 40 });
          return;
        }
        let $ = cheerio.load(result.body),
          script = $('script')[5].children[0].data,
          name;
        try {
          script = script.replace('new (require("ServerJS"))().setServerFeatures("iw").handle(', '').replace(');', '');
          script = JSON.parse(script);
        } catch (e) {
          logger.debug('视频列表页解析失败', script);
          callback(err, { code: 102, p: 40 });
          return;
        }
        for (let i = 0; i < script.markup.length; i++) {
          if (script.markup[i] && script.markup[i][2] == 1) {
            $ = cheerio.load(script.markup[i][1].__html);
            name = $('span._33vv').text();
          }
        }
        for (let i = 0; i < script.require.length; i++) {
          if (script.require[i] && script.require[i][3] && script.require[i][3][1]) {
            if (script.require[i][3][1].name && script.require[i][3][1].name == name) {
              res = {
                id: script.require[i][3][1].pageID,
                name,
                avatar: script.require[i][3][1].usernameEditDialogProfilePictureURI,
                p: 40
              };
            }
          }
        }
        callback(null, res);
      });
      return;
    } else if (pathname.split('/').length <= 3) {
      option.url = data;
      option.referer = 'https://www.facebook.com';
      request.get(option, (err, result) => {
        if (err) {
          logger.debug('facebook视频列表页请求失败', err);
          callback(err, { code: 102, p: 40 });
          return;
        }
        let $ = cheerio.load(result.body),
          script = $('script')[5].children[0].data,
          name,
          startIndex = null,
          endIndex = null,
          isEnd = script.indexOf('new (require("ServerJS"))().setServerFeatures("iw").handle(');
        if (isEnd === -1) {
          script = $('script')[11].children[0].data;
          startIndex = script.indexOf('.schedule(');
          endIndex = script.indexOf(', function()');
          script = script.substring(startIndex + 10, endIndex);
          try {
            script = JSON.parse(script);
          } catch (e) {
            logger.debug('-1视频列表页解析失败', result.body);
            callback(err, { code: 102, p: 40 });
            return;
          }
          $ = cheerio.load(script.content.__html);
          bid = JSON.parse($('div.notTransparent.coverPhotoSection').attr('data-store')).log_data.page_id;
          name = $('div._4g34._1p72 span._1p7o').text();
          startIndex = $('div._4g33._1p70 i').attr('style').indexOf('url("');
          endIndex = $('div._4g33._1p70 i').attr('style').indexOf('")');
          avatar = $('div._4g33._1p70 i').attr('style').substring(startIndex + 5, endIndex);
          res = {
            id: bid,
            name,
            avatar,
            p: 40
          };
          callback(null, res);
        }
      });
      return;
    }
    option.url = `https://www.facebook.com/${bid}/videos/${aid}/`;
    request.get(option, (err, result) => {
      if (err) {
        logger.debug('facebook请求失败', err);
        callback(err, { code: 102, p: 40 });
        return;
      }
      if (result.statusCode !== 200) {
        logger.debug('facebook状态码错误', result.statusCode);
        callback(true, { code: 102, p: 40 });
        return;
      }
      result = result.body.replace(/[\n\s\r]/g, '');
      bid = result.match(/actorid:"(\d*)/)[1];
      name = result.substring(result.indexOf('actorname:"') + 11, result.indexOf('",allowphotoattachments'));
      avatar = result.substring(result.indexOf('style="background-image:url(') + 28, result.indexOf(');"id="')).replace(/amp;/g, '');
      res = {
        id: bid,
        name,
        avatar,
        p: 40
      };
      callback(null, res);
    });
  }

  renren(data, callback) {
    let urlObj = URL.parse(data, true),
      host = urlObj.hostname,
      hash = urlObj.hash,
      res = null,
      vid = host === 'rr.tv' ? hash.split('/')[2] : urlObj.query.id,
      avatar = null,
      options = {
        method: 'POST',
        url: 'http://web.rr.tv/v3plus/video/detail',
        headers:
        { clienttype: 'web',
          clientversion: '0.1.0',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
          referer: 'http//rr.tv/'
        },
        form: {
          videoId: vid
        }
      };
    r(options, (error, response, body) => {
      if (error) {
        logger.debug('视频接口请求失败', error.message);
        return callback(error, { code: 102, p: 41 });
      }
      if (response.statusCode !== 200) {
        logger.debug('视频接口状态码错误', response.statusCode);
        return callback(response.statusCode, { code: 102, p: 41 });
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('数据解析失败：', body);
        return callback(e, { code: 103, p: 41 });
      }
      avatar = body.data.videoDetailView.author.headImgUrl || 'https://img.rr.tv/static/images/20170307/img_me_userpic.png';
      res = {
        id: body.data.videoDetailView.author.id,
        name: body.data.videoDetailView.author.nickName,
        avatar,
        p: 41
      };
      callback(null, res);
    });
  }
  dianshi(data, callback) {
    const urlObj = URL.parse(data, true),
      vid = urlObj.query.videoId,
      options = {
        method: 'POST',
        url: 'https://prod2.click-v.com/ds_platform/video/getVideoDetails',
        headers:
        {
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
        },
        body: { videoId: vid },
        json: true
      };
    let res = null;
    r(options, (error, response, body) => {
      if (error) {
        logger.debug('视频接口请求失败', error.message);
        callback(error, { code: 102, p: 42 });
        return;
      }
      if (response.statusCode !== 200) {
        logger.debug('视频接口状态码错误', response.statusCode);
        callback(response.statusCode, { code: 102, p: 42 });
        return;
      }
      res = {
        id: body.data.brand.brandId,
        name: body.data.brand.brandName,
        avatar: body.data.brand.brandIconUrl,
        p: 42
      };
      callback(null, res);
    });
  }
  bolo(data, callback) {
    const urlObj = URL.parse(data, true),
      vid = urlObj.query.videoId,
      options = {
        url: `http://bolo.163.com/bolo/api/video/videoInfo.htm?videoId=${vid}`,
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        referer: 'http://bolo.163.com'
      };
    let res = null;
    request.get(options, (err, result) => {
      if (err) {
        logger.debug('视频数据接口请求失败', err.message);
        callback(error, { code: 102, p: 44 });
        return;
      }
      if (result.statusCode !== 200) {
        logger.debug('视频接口状态码错误', result.statusCode);
        callback(result.statusCode, { code: 102, p: 44 });
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('视频数据解析失败', result.body);
        callback(e, { code: 102, p: 44 });
        return;
      }
      res = {
        id: result.videoInfo.userIdStr,
        name: result.channelInfo.nick,
        avatar: result.channelInfo.avatar,
        p: 44
      };
      callback(null, res);
    });
  }
  huoshan(data, callback) {
    const urlObj = URL.parse(data, true),
      options = {
        url: data,
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
      };
    let res = null;
    request.get(options, (error, result) => {
      if (error) {
        logger.error('视频接口请求失败', error.message);
        callback(error, { code: 102, p: 45 });
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      const startIndex = result.indexOf('vardata='),
        endIndex = result.indexOf(";require('pagelet/reflow_video/detail/detail')");
      result = result.substring(startIndex + 8, endIndex);
      try {
        result = JSON.parse(result);
      } catch (e) {
        logger.error('火山小视频信息解析失败', result);
        callback(e, { code: 102, p: 45});
        return;
      }
      res = {
        id: result.author.id,
        name: result.author.nickname,
        avatar: result.author.avatar_thumb.url_list[2],
        p: 45
      };
      callback(null, res);
    });
  }
}
module.exports = DealWith;