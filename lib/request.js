const request = require('request');

const PCUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.82 Safari/537.36';
const MUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1';
exports.get = (logger, option, callback) => {
  let back = {}, userAgent;
  switch (option.ua) {
    case 1:
      userAgent = PCUA;
      break;
    case 2:
      userAgent = MUA;
      break;
    case 3:
      userAgent = option.own_ua;
      break;
    default:
      userAgent = null;
      break;
  }
  const options = {
    method: 'GET',
    proxy: option.proxy ? option.proxy.replace('https', 'http') : null,
    url: option.url,
    timeout: 5000,
    headers: option.headers ? option.headers : {
      Referer: option.referer || null,
      'User-Agent': userAgent,
      deviceType: option.deviceType || null,
      Cookie: option.Cookie || null
    }
  };
  if (!options.proxy) {
    delete options.proxy;
  }
  if (!options.headers['User-Agent']) {
    delete options.headers['User-Agent'];
  }
  if (!options.headers.Referer) {
    delete options.headers.Referer;
  }
  if (!options.headers.deviceType) {
    delete options.headers.deviceType;
  }
  if (!options.headers.Cookie) {
    delete options.headers.Cookie;
  }
  request.get(options, (err, res, body) => {
    if (err) {
      // logger.error( 'occur error : ', err.message )
      // logger.error( `error url: ${option.url}` )
      return callback(err);
    }
    if (res.statusCode !== 200) {
      // logger.error(`请求状态有误: ${res.statusCode}`)
      // logger.error( `error url: ${option.url}` )
      return callback({ status: res.statusCode, message: res.statusCode });
    }
    back = {
      statusCode: res.statusCode,
      headers: JSON.stringify(res.headers),
      body
    };
    return callback(null, back);
  });
};
exports.post = (logger, option, callback) => {
  let back = {}, userAgent;
  switch (option.ua) {
    case 1:
      userAgent = PCUA;
      break;
    case 2:
      userAgent = MUA;
      break;
    case 3:
      userAgent = option.own_ua;
      break;
    default:
      userAgent = null;
      break;
  }
  const options = {
    method: 'POST',
    url: option.url,
    headers: option.headers ? option.headers : {
      'content-type': option.contentType || null,
      Referer: option.referer || null,
      'User-Agent': userAgent
    },
    form: option.data
  };
  if (!options.headers['User-Agent']) {
    delete options.headers['User-Agent'];
  }
  if (!options.headers.Referer) {
    delete options.headers.Referer;
  }
  if (!options.headers['content-type']) {
    delete options.headers['content-type'];
  }
  request.post(options, (err, res, body) => {
    if (err) {
      logger.error('occur error : ', err.message);
      logger.error(`error url: ${option.url}`);
      return callback(err);
    }
    if (res.statusCode !== 200) {
      logger.error(`请求状态有误: ${res.statusCode}`);
      logger.error(`error url: ${option.url}`);
      return callback(true);
    }
    back = {
      statusCode: res.statusCode,
      headers: JSON.stringify(res.headers),
      body
    };
    return callback(err, back);
  });
};
