const request = require('request');
const cheerio = require('cheerio');
const vm = require('vm');
const sandbox = {
  jsonp(data) {
    return data;
  }
};
exports.youku = user => new Promise((resolve, reject) => {
  const options = {
    method: 'POST',
    url: 'https://openapi.youku.com/v2/users/show.json',
    form: {
      client_id: 'c9e697e443715900',
      user_id: user.bid
    }
  };
  request(options, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.avatar_large
    });
  });
});
exports.iqiyi = user => new Promise((resolve, reject) => {
  const url = `http://www.iqiyi.com/u/${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.message);
    }
    let $ = cheerio.load(body),
      avatar = $('img.photo').eq(0).attr('src');
    avatar = avatar || $('div.profile_pic img').attr('src');
    resolve({
      p: user.platform,
      id: user.bid,
      avatar
    });
  });
});
exports.le = user => new Promise((resolve, reject) => {
  const url = `http://api.chuang.letv.com/outer/ugc/video/user/videocount?callback=jsonp&userid=${user.bid}&_=${(new Date()).getTime()}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      const script = new vm.Script(body);
      const context = new vm.createContext(sandbox);
      body = script.runInContext(context);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.data['pic300*300']
    });
  });
});
exports.tencent = user => new Promise((resolve, reject) => {
  const url = `http://v.qq.com/vplus/${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.message);
    }
    let $ = cheerio.load(body),
      avatar = $('div.user_avatar img').attr('src');
    if (avatar) {
      resolve({
        p: user.platform,
        id: user.bid,
        avatar
      });
    } else {
      body = body.replace(/[\s\n\r]/g, '');
      let startIndex = body.indexOf('location.href="'),
        endIndex = body.indexOf('"</script>'),
        htmlUrl = body.substring(startIndex + 15, endIndex);
      request(htmlUrl, (error, response, body) => {
        if (error) {
          return reject(error.message);
        }
        if (response.statusCode !== 200) {
          return reject(response.message);
        }
        let $ = cheerio.load(body),
          avatar = $('div.user_avatar img').attr('src');
        resolve({
          p: user.platform,
          id: user.bid,
          avatar
        });
      });
    }
  });
});
exports.meipai = user => new Promise((resolve, reject) => {
  const url = `https://newapi.meipai.com/users/show.json?id=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.avatar
    });
  });
});
exports.toutiao = user => new Promise((resolve, reject) => {
  const url = `http://lf.snssdk.com/2/user/profile/v3/?media_id=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.data.big_avatar_url
    });
  });
});
exports.miaopai = user => new Promise((resolve, reject) => {
  const url = `http://api.miaopai.com/m/shot_channel.json?version=6.3.7&os=ios&page=1&per=20&suid=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.header.icon
    });
  });
});
exports.bili = user => new Promise((resolve, reject) => {
  const options = {
    method: 'POST',
    url: 'http://space.bilibili.com/ajax/member/GetInfo',
    headers: {
      Referer: `http://space.bilibili.com/${user.bid}/`
    },
    form: {
      mid: user.bid
    }
  };
  request(options, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: `${body.data.face}@75Q.webp`
    });
  });
});
exports.sohu = user => new Promise((resolve, reject) => {
  const url = `http://api.tv.sohu.com/v4/user/info/${user.bid}.json?api_key=f351515304020cad28c92f70f002261c&_=${(new Date()).getTime()}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
            // console.log(body)
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.data.bg_pic ? body.data.bg_pic.replace('1.jpg', '0.jpg') : body.data.small_pic.replace('1.jpg', '0.jpg')
    });
  });
});
exports.kuaibao = user => new Promise((resolve, reject) => {
  const url = `http://r.cnews.qq.com/getSubItem?chlid=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    if (body.ret != 0) {
      return reject(body.ret);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.channelInfo.icon
    });
  });
});
exports.yidian = user => new Promise((resolve, reject) => {
  const url = `http://www.yidianzixun.com/api/q/?fields=docid&fields=category&fields=date&fields=image&fields=image_urls&fields=like&fields=source&fields=title&fields=url&fields=comment_count&fields=summary&fields=up&version=999999&infinite=true&path=channel|news-list-for-channel&channel_id=${user.bid}&cstart=0&cend=10`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
            // console.log(body.result[0])
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.channel_image
    });
  });
});
exports.tudou = user => new Promise((resolve, reject) => {
  setTimeout(() => {
    const url = `http://user.api.3g.tudou.com/v4/channel/info?guid=7066707c5bdc38af1621eaf94a6fe779&pid=c0637223f8b69b02&id=${user.bid}`;
    request(url, (error, response, body) => {
      if (error) {
        return reject(error.message);
      }
      if (response.statusCode !== 200) {
        return reject(response.statusCode);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        return reject(e.message);
      }
      resolve({
        p: user.platform,
        id: user.bid,
        avatar: body.pic
      });
    });
  }, 5000);
});
exports.baomihua = user => new Promise((resolve, reject) => {
  const url = `http://m.interface.baomihua.com/interfaces/userchannel.ashx?channelid=${user.bid}&type=channelinfo`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.result.ChannelInfo.MidPic
    });
  });
});
exports.ku6 = user => new Promise((resolve, reject) => {
  const url = `http://boke.ku6.com/${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    let $ = cheerio.load(body),
      avatar = $('#channelAvatar').attr('src');
    resolve({
      p: user.platform,
      id: user.bid,
      avatar
    });
  });
});
exports.btime = user => new Promise((resolve, reject) => {
  const url = `http://record.btime.com/getUserChannel?uid=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.data.icon
    });
  });
});
exports.weishi = user => new Promise((resolve, reject) => {
  const url = `http://weishi.qq.com/u/${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    let $ = cheerio.load(body),
      avatar = $('#userpic').attr('src');
    resolve({
      p: user.platform,
      id: user.bid,
      avatar
    });
  });
});
exports.xiaoying = user => new Promise((resolve, reject) => {
  const url = `https://w.api.xiaoying.co/webapi2/rest/user/detail?appkey=30000000&auid=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.user.logo
    });
  });
});
exports.budejie = user => new Promise((resolve, reject) => {
  const url = `http://api.budejie.com/api/api_open.php?a=profile&c=user&userid=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.data.profile_image_large
    });
  });
});
exports.neihan = user => new Promise((resolve, reject) => {
  const url = `http://isub.snssdk.com/neihan/user/profile/v2/?user_id=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.data.large_avatar_url
    });
  });
});
exports.yy = user => new Promise((resolve, reject) => {
  const url = `http://www.yy.com/u/${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    let $ = cheerio.load(body),
      avatar = $('.avatar-icon').attr('src');
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: `http:${avatar}`
    });
  });
});
exports.tv56 = user => new Promise((resolve, reject) => {
  const url = `http://api.tv.sohu.com/v4/user/info/${user.bid}.json?api_key=f351515304020cad28c92f70f002261c&_=${(new Date()).getTime()}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
            // console.log(body)
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.data.bg_pic ? body.data.bg_pic.replace('1.jpg', '0.jpg') : body.data.small_pic.replace('1.jpg', '0.jpg')
    });
  });
});
exports.acfun = user => new Promise((resolve, reject) => {
  const options = {
    method: 'GET',
    url: `http://api.aixifan.com/users/${user.bid}`,
    headers: {
      referer: `http://m.acfun.tv/details?upid=${user.bid}`,
      deviceType: 2
    }
  };
  request(options, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
            // console.log(body)
    resolve({
      p: user.platform,
      id: user.bid,
      avatar: body.data.userImg
    });
  });
});
exports.weibo = user => new Promise((resolve, reject) => {
  setTimeout(() => {
    const url = `http://m.weibo.cn/container/getIndex?sudaref=m.weibo.cn&retcode=6102&type=uid&value=${user.bid}`;
    request(url, (error, response, body) => {
      if (error) {
        return reject(error.message);
      }
      if (response.statusCode !== 200) {
        return reject(response.statusCode);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        return reject(e.message);
      }
      const avatar = body.userInfo.profile_image_url ? body.userInfo.profile_image_url : '';
      resolve({
        p: user.platform,
        id: user.bid,
        avatar
      });
    });
  }, 8000);
});
exports.ifeng = user => new Promise((resolve, reject) => {
  const options = {
    method: 'GET',
    url: `http://vcis.ifeng.com/api/weMediaVideoList?type=new&pageSize=20&weMediaID=${user.bid}`,
    headers: {
      'user-agent': 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
    }
  };
  request(options, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    const avatar = body.infoList[0].weMedia.headPic ? body.infoList[0].weMedia.headPic : '';
    resolve({
      p: user.platform,
      id: user.bid,
      avatar
    });
  });
});
exports.wangyi = user => new Promise((resolve, reject) => {
  const url = `http://c.m.163.com/nc/topicset/home/android/${user.bid}.html`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    const avatar = body.topicSet.img.substring(0, 1) !== 'T' ? body.topicSet.img : body.topicSet.topic_icons;
    resolve({
      p: user.platform,
      id: user.bid,
      avatar
    });
  });
});
exports.uctt = user => new Promise((resolve, reject) => {
  const url = `http://napi.uc.cn/3/classes/article/categories/wemedia/lists/${user.bid}?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_size=5&_max_pos=&uc_param_str=frdnsnpfvecpntnwprdsssnikt`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    const avatar = body.data[0].avatar_url ? body.data[0].avatar_url : '';
    resolve({
      p: user.platform,
      id: user.bid,
      avatar
    });
  });
});
exports.mgtv = user => new Promise((resolve, reject) => {
  const url = `http://www.mgtv.com/h/${user.bid}.html?fpa=se`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    let $ = cheerio.load(body),
      avatar = $('a.banner>img').attr('src');
    if (!avatar) {
      avatar = '';
    }
    resolve({
      p: user.platform,
      id: user.bid,
      avatar
    });
  });
});
exports.baijia = user => new Promise((resolve, reject) => {
  const avatar = (arr) => {
    if (!arr) {
      return reject('当前渠道未完成');
    }
    let index = 0,
      url = `https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22${arr[index]}%22%7D`;
    request(url, (error, response, body) => {
      if (error) {
        return reject(error.message);
      }
      if (response.statusCode !== 200) {
        return reject(response.statusCode);
      }
      const $ = cheerio.load(body);
      if ($('div.item p').eq(0).text() == '视频已失效，请观看其他视频') {
        if (index > 1) {
          return reject('当前渠道未完成');
        }
        index++;
        return avatar(arr);
      }
      let data = body.replace(/[\s\n\r]/g, ''),
        startIndex = data.indexOf('videoData={"id'),
        endIndex = data.indexOf(';window.listInitData'),
        dataJson = data.substring(startIndex + 10, endIndex);
      try {
        dataJson = JSON.parse(dataJson);
      } catch (e) {
        return avatar(arr);
      }

      let avatar = dataJson.app ? (dataJson.app.avatar ? dataJson.app.avatar : '') : '';
      return resolve({
        p: user.platform,
        id: user.bid,
        avatar
      });
    });
  };
  const url = `http://baijiahao.baidu.com/api/content/article/listall?sk=super&ak=super&_skip=0&status=in:publish,published&_preload_statistic=1&_timg_cover=50,172,1000&_cache=1&app_id=${user.bid}&_limit=200`;
  const arr = [];
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    for (let i = 0; i < body.items.length; i++) {
      if (body.items[i].type == 'video' && body.items[i].feed_id != '') {
        arr.push(body.items[i].feed_id);
        if (arr.length >= 2) {
          avatar(arr);
          return;
        }
      }
    }
  });
});
exports.qzone = user => new Promise((resolve, reject) => {
  const avatar = `https://qlogo4.store.qq.com/qzone/${user.bid}/${user.bid}/100?`;
  resolve({
    p: user.platform,
    id: user.bid,
    avatar
  });
});
exports.cctv = user => new Promise((resolve, reject) => {
  const url = `http://my.xiyou.cntv.cn/api/user/getuserinfo?&format=json&visit_id=0&snap=30&user_id=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    const isNo = body.data.user_head.toString().indexOf('30x30');
    if (isNo) {
      resolve({
        p: user.platform,
        id: user.bid,
        avatar: body.data.user_head.toString().replace('30x30', '120x120')
      });
    } else {
      resolve({
        p: user.platform,
        id: user.bid,
        avatar: body.data.user_head
      });
    }
  });
});
exports.xinlan = user => new Promise((resolve, reject) => {
  const url = `http://so.cztv.com/pc/s?wd=${encodeURIComponent(user.bname)}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    let $ = cheerio.load(body),
      avatars = $('div.ui-search-results');
    if (avatars.length <= 0) {
      return reject('异常');
    }
    for (let i = 0; i < avatars.length; i++) {
      let bname = avatars.eq(i).find('li.ui-cf div.ui-fl>img').attr('title'),
        avatar = avatars.eq(i).find('li.ui-cf div.ui-fl>img').attr('src');
      if (user.bname === bname) {
        return resolve({
          p: user.platform,
          id: user.bid,
          avatar
        });
      }
    }
  });
});
exports.v1 = user => new Promise((resolve, reject) => {
  let url = `http://dynamic.app.m.v1.cn/www/dynamic.php?mod=user&ctl=video&act=get&version=4.5.4&uid=${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    url = `http://static.app.m.v1.cn/www/mod/mob/ctl/videoDetails/act/get/vid/${body.body.data[0].vid}/pcode/010210000/version/4.5.4.mindex.html`;
    request(url, (error, response, body) => {
      if (error) {
        return reject(error.message);
      }
      if (response.statusCode !== 200) {
        return reject(response.statusCode);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        return reject(e.message);
      }
      resolve({
        p: user.platform,
        id: user.bid,
        avatar: body.body.obj.videoDetail.userInfo.userImg
      });
    });
  });
});
exports.fengxing = user => new Promise((resolve, reject) => {
  let url = '';
  if (user.bid.toString().length < 5) {
    url = `http://www.fun.tv/channel/${user.bid}/`;
    request(url, (error, response, body) => {
      if (error) {
        return reject(error.message);
      }
      if (response.statusCode !== 200) {
        return reject(response.statusCode);
      }
      let $ = cheerio.load(body),
        avatar = $('div.chan-head-ico img').attr('src');
      resolve({
        p: user.platform,
        id: user.bid,
        avatar
      });
    });
  } else {
    url = `http://www.fun.tv/subject/${user.bid}/`;
    request(url, (error, response, body) => {
      if (error) {
        return reject(error.message);
      }
      if (response.statusCode !== 200) {
        return reject(response.statusCode);
      }
      let $ = cheerio.load(body),
        avatar = $('a.play-btn-a img').attr('_lazysrc');
      resolve({
        p: user.platform,
        id: user.bid,
        avatar
      });
    });
  }
});
exports.huashu = user => new Promise((resolve, reject) => {
  const url = `http://www.wasu.cn/Agginfo/index/id/${user.bid}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    let $ = cheerio.load(body),
      avatar = $('div.img_box>img').attr('src');
    resolve({
      p: user.platform,
      id: user.bid,
      avatar
    });
  });
});
exports.baofeng = user => new Promise((resolve, reject) => {
  let length = user.id.toString().length,
    avaId = user.bid.substring(length - 1, length + 1);
  resolve({
    p: user.platform,
    id: user.bid,
    avatar: `http://box.bfimg.com/img/${avaId}/${user.bid}/51_270*340.jpg`
  });
});
exports.baiduVideo = user => new Promise((resolve, reject) => {
  const url = `http://v.baidu.com/tagapi?type=2&tag=${encodeURIComponent(user.bname)}&_=${new Date().getTime()}`;
  request(url, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    const avatar = body.data[0].tag_info ? body.data[0].tag_info.bigimgurl : '';
    resolve({
      p: user.platform,
      id: user.bid,
      avatar
    });
  });
});
exports.pptv = user => new Promise((resolve, reject) => {
  reject('未完成');
});