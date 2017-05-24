/**
 *  update by pnghui on 2017/4/28
 * */
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
          data = { errno: 101, errmsg: '账号验证失败', data: { platform: result.p } };
          break;
        case 102:
          data = { errno: 102, errmsg: '该URL不是合法播放页地址', data: { platform: result.p } };
          break;
        case 103:
          data = { errno: 103, errmsg: '获取信息过程出错', data: { platform: result.p } };
          break;
        case 105:
          data = { errno: 105, errmsg: '输入的值没找到', data: { platform: result.p } };
          break;
        default:
          data = { errno: 999, errmsg: '未知错误', data: { platform: result.p } };
          break;
      }
    }else if (!result.id || result.id === '' || result.id <= 0) {
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
          encodeId: result.encode_id ? result.encode_id : ''
        }
      };
    }
    return data;
  }
  youkuHandle(ctx, verifyData) {
    dealWith.youku(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  iqiyiHandle(ctx, verifyData) {
    dealWith.iqiyi(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  leHandle(ctx, verifyData) {
    dealWith.le(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  tencentHandle(ctx, verifyData) {
    dealWith.tencent(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  meipaiHandle(ctx, verifyData) {
    dealWith.meipai(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  toutiaoHandle(ctx, verifyData) {
    dealWith.toutiao(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  miaopaiHandle(ctx, verifyData) {
    // includes需要用数组方法
    const DataUrl = [verifyData.remote];
    if (!((DataUrl[0].includes('.htm') && DataUrl[0].includes('/show/')) || DataUrl[0].includes('/show/channel/'))) {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, { code: 101, p: 7 })));
      return;
    }
    dealWith.miaopai(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  biliHandle(ctx, verifyData) {
    dealWith.bili(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  sohuHandle(ctx, verifyData) {
    dealWith.sohu(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  kuaibaoHandle(ctx, verifyData) {
    dealWith.kuaibao(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  yidianHandle(ctx, verifyData) {
    dealWith.yidian(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  tudouHandle(ctx, verifyData) {
    dealWith.tudou(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  baomihuaHandle(ctx, verifyData) {
    dealWith.baomihua(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  ku6Handle(ctx, verifyData) {
    dealWith.ku6(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  btimeHandle(ctx, verifyData) {
    dealWith.btime(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  weishiHandle(ctx, verifyData) {
    dealWith.weishi(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  xiaoyingHandle(ctx, verifyData) {
    dealWith.xiaoying(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  budejieHandle(ctx, verifyData) {
    dealWith.budejie(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  neihanHandle(ctx, verifyData) {
    dealWith.neihan(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  yyHandle(ctx, verifyData) {
    dealWith.yy(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  tv56Handle(ctx, verifyData) {
    dealWith.tv56(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  acfunHandle(ctx, verifyData) {
    dealWith.acfun(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  ucHandle(ctx, verifyData) {
    dealWith.uc(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  ifengHandle(ctx, verifyData) {
    dealWith.ifeng(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  qzoneHandle(ctx, verifyData) {
    dealWith.qzone(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  wangyiHandle(ctx, verifyData) {
    dealWith.wangyi(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  mgtvHandle(ctx, verifyData) {
    dealWith.mgtv(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  weiboHandle(ctx, verifyData) {
    dealWith.weibo(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  // pptvHandle ( ctx, verifyData ) {
  //     dealWith.pptv( verifyData, ( err, result ) => {
  //         ctx.res.setHeader('Content-Type',`text/plain;charset=utf-8`)
  //         ctx.res.writeHead(200)
  //         ctx.res.end(JSON.stringify(this.preResult(err,result)))
  //     })
  // }
  xinlanHandle(ctx, verifyData) {
    dealWith.xinlan(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  cctvHandle(ctx, verifyData) {
    dealWith.cctv(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  v1Handle(ctx, verifyData) {
    dealWith.v1(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  // fengxingHandle ( ctx, verifyData ) {
  //     dealWith.fengxing( verifyData, ( err, result ) => {
  //         ctx.res.setHeader('Content-Type',`text/plain;charset=utf-8`)
  //         ctx.res.writeHead(200)
  //         ctx.res.end(JSON.stringify(this.preResult(err,result)))
  //     })
  // }
  huashuHandle(ctx, verifyData) {
    dealWith.huashu(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  youtubeHandle(ctx, verifyData) {
    dealWith.youtube(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  facebookHandle(ctx, verifyData) {
    dealWith.facebook(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  renrenHandle(ctx, verifyData) {
    dealWith.renren(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
  huoshanHandle(ctx, verifyData) {
    dealWith.huoshan(verifyData, (err, result) => {
      ctx.res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      ctx.res.writeHead(200);
      ctx.res.end(JSON.stringify(this.preResult(err, result)));
    });
  }
}
module.exports = Handle;
