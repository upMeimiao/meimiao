const DealWith = require('./dealWith');

let dealWith, logger;

class Handle {
  constructor(core) {
    dealWith = new DealWith(core);
    logger = core.settings.logger;
    logger.debug('控制器实例化...');
  }
  preResult(err, result) {
    let data;
    if (err) {
      switch (result.code) {
        case 101:
          data = { errno: 101, errmsg: '该URL不是合法播放页地址', data: { platform: result.p } };
          break;
        case 102:
          data = { errno: 102, errmsg: '获取信息过程出错', data: { platform: result.p } };
          break;
        case 103:
          data = { errno: 103, errmsg: '不是自频道', data: { platform: result.p } };
          break;
        case 104:
          data = { errno: 104, errmsg: '请不要选择最新发布的视频', data: { platform: result.p } };
          break;
        default:
          data = { errno: 999, errmsg: '未知错误', data: { platform: result.p } };
          break;
      }
    } else if (!result.id || result.id === '' || result.id <= 0) {
      data = {
        errno: 103,
        errmsg: '没有获取到bid',
        data: {
          platform: result.p
        }
      };
    } else if (!result.name || result.name === '') {
      data = {
        errno: 104,
        errmsg: '没有获取到bname',
        data: {
          platform: result.p
        }
      };
    } else {
      data = {
        errno: 0,
        errmsg: '获取信息成功',
        data: {
          platform: result.p,
          bid: result.id,
          bname: result.name,
          type: result.type ? result.type : 0,
          encodeId: result.encode_id ? result.encode_id : '',
          avatar: result.avatar ? result.avatar : ''
        }
      };
    }
    return data;
  }
  youkuHandle(ctx, remote) {
    dealWith.youku(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  iqiyiHandle(ctx, remote) {
    dealWith.iqiyi(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  leHandle(ctx, remote) {
    dealWith.le(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  tencentHandle(ctx, remote) {
    dealWith.tencent(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  meipaiHandle(ctx, remote) {
    dealWith.meipai(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  toutiaoHandle(ctx, remote) {
    dealWith.toutiao(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  miaopaiHandle(ctx, remote, type) {
    if (!type && !((remote.includes('.htm') && remote.includes('/show/')) || remote.includes('/show/channel/'))) {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(true, { code: 101, p: 7 })));
      return;
    }
    dealWith.miaopai(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  biliHandle(ctx, remote) {
    dealWith.bili(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  sohuHandle(ctx, remote) {
    dealWith.sohu(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  kuaibaoHandle(ctx, remote) {
    dealWith.kuaibao(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  yidianHandle(ctx, remote) {
    dealWith.yidian(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  tudouHandle(ctx, remote) {
    dealWith.tudou(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  baomihuaHandle(ctx, remote) {
    dealWith.baomihua(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  ku6Handle(ctx, remote) {
    dealWith.ku6(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  btimeHandle(ctx, remote) {
    dealWith.btime(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  weishiHandle(ctx, remote) {
    dealWith.weishi(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  xiaoyingHandle(ctx, remote) {
    dealWith.xiaoying(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  budejieHandle(ctx, remote) {
    dealWith.budejie(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  neihanHandle(ctx, remote) {
    dealWith.neihan(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  yyHandle(ctx, remote) {
    dealWith.yy(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  tv56Handle(ctx, remote) {
    dealWith.tv56(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  acfunHandle(ctx, remote) {
    dealWith.acfun(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  weiboHandle(ctx, remote) {
    dealWith.weibo(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  ifengHandle(ctx, remote) {
    dealWith.ifeng(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  wangyiHandle(ctx, remote) {
    dealWith.wangyi(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  ucHandle(ctx, remote) {
    dealWith.uctt(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  mgtvHandle(ctx, remote) {
    dealWith.mgtv(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  qzoneHandle(ctx, remote) {
    dealWith.qzone(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  cctvHandle(ctx, remote) {
    dealWith.cctv(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  pptvHandle(ctx, remote) {
    dealWith.pptv(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  xinlanHandle(ctx, remote) {
    dealWith.xinlan(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  v1Handle(ctx, remote) {
    dealWith.v1(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  fengxingHandle(ctx, remote) {
    dealWith.fengxing(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  huashuHandle(ctx, remote) {
    dealWith.huashu(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  baofengHandle(ctx, remote) {
    dealWith.baofeng(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  baiduHandle(ctx, remote) {
    dealWith.baidu(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  baijiaHandle(ctx, remote) {
    dealWith.baijia(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  liVideoHandle(ctx, remote) {
    dealWith.liVideo(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
    // xiangkanHandle ( ctx, remote ) {
    //     dealWith.xiangkan( remote, ( err, result ) => {
    //         ctx.res.setHeader('Content-Type',`text/plain;charset=utf-8`);
    //         ctx.res.writeHead(200);
    //         ctx.res.end(JSON.stringify(this.preResult(err,result)))
    //     })
    // }
  youtubeHandle(ctx, remote) {
    dealWith.youtube(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  facebookHandle(ctx, remote) {
    dealWith.facebook(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  renrenHandle(ctx, remote) {
    dealWith.renren(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  dianshiHandle(ctx, remote) {
    dealWith.dianshi(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  boloHandle(ctx, remote) {
    dealWith.bolo(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  huoshanHandle(ctx, remote) {
    dealWith.huoshan(remote, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
}
module.exports = Handle;