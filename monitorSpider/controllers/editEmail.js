/**
*  Create by zhupenghui on 2017/6/13.
* */

const sendEmail = require('./sendEmail');
const logging = require('log4js');

let logger = logging.getLogger('邮件编写模块');
/**
 *  接口出现错误之后，按照错误类型以不同的邮件级别发送
 *  暂时先分为五大类型：
 *  error    ===》 请求出错
 *  status   ===》 状态码出错
 *  json     ===》 数据解析失败
 *  bid      ===》 当前自媒体被平台所屏蔽（或者账号错误）
 *  data     ===》 数据异常
 * */
exports.interEmail = (events, message) => {
  logger.debug('邮件发送模块成功进入');
  switch (message.typeErr) {
    case 'error':
      let emailContent = '<table border="1" cellpadding="0" cellspacing="0" style="boder:1px #000 solid; background: rgb(255, 89, 148);>';
      emailContent += `<tbody><tr><td width="120">平台</td><td>${message.platform}</td></tr><tr><td width="120">用户ID</td><td>${message.bid}</td></tr><tr><td width="120">用户名称</td><td>${message.bname}</td></tr>`;
      emailContent += `<tr><td width="120">接口类型</td><td>${message.typeErr}:${message.interface}</td></tr><tr><td width="120">接口</td><td>${message.url}</td></tr>`;
      emailContent += `<tr><td width="120">错误信息</td><td>${message.message}</td></tr><tr><td width="120">出错时间</td><td>${message.lastTime}</td></tr></tbody></table>`;
      sendEmail.sendEmail(`${message.platform}平台 接口请求出错`, emailContent, message.type);
      break;
    case 'status':
      if (message.typeErr < 500 && message.typeErr >= 400) {
        let emailContent = '<table border="1" cellpadding="0" cellspacing="0" style="boder:1px #000 solid; background: rgba(0, 74, 255, 0.42);">';
        emailContent += `<tbody><tr><td width="120">平台</td><td>${message.platform}</td></tr><tr><td width="120">用户ID</td><td>${message.bid}</td></tr><tr><td width="120">用户名称</td><td>${message.bname}</td></tr>`;
        emailContent += `<tr><td width="120">接口类型</td><td>${message.typeErr}:${message.interface}</td></tr><tr><td width="120">接口</td><td>${message.url}</td></tr>`;
        emailContent += `<tr><td width="120">错误信息</td><td>${message.message}</td></tr><tr><td width="120">出错时间</td><td>${message.lastTime}</td></tr></tbody></table>`;
        sendEmail.sendEmail(`${message.platform}平台 接口请求400状态`, emailContent, message.type);
      } else {
        let emailContent = '<table border="1" cellpadding="0" cellspacing="0" style="boder:1px #000 solid; background: rgba(211, 255, 0, 0.44);">';
        emailContent += `<tbody style=""><tr><td width="120">平台</td><td>${message.platform}</td></tr><tr><td width="120">用户ID</td><td>${message.bid}</td></tr><tr><td width="120">用户名称</td><td>${message.bname}</td></tr>`;
        emailContent += `<tr><td width="120">接口类型</td><td>${message.typeErr}:${message.interface}</td></tr><tr><td width="120">接口</td><td>${message.url}</td></tr>`;
        emailContent += `<tr><td width="120">错误信息</td><td>${message.message}</td></tr><tr><td width="120">出错时间</td><td>${message.lastTime}</td></tr></tbody></table>`;
        sendEmail.sendEmail(`${message.platform}平台 接口请求${message.typeErr}状态`, emailContent, message.type);
      }
      break;
    case 'json':
      let emailContent = '<table border="1" cellpadding="0" cellspacing="0" style="boder:1px #000 solid; background: rgba(0, 74, 255, 0.42);">';
      emailContent += `<tbody><tr><td width="120">平台</td><td>${message.platform}</td></tr><tr><td width="120">用户ID</td><td>${message.bid}</td></tr><tr><td width="120">用户名称</td><td>${message.bname}</td></tr>`;
      emailContent += `<tr><td width="120">接口类型</td><td>${message.typeErr}:${message.interface}</td></tr><tr><td width="120">接口</td><td>${message.url}</td></tr>`;
      emailContent += `<tr><td width="120">错误信息</td><td>${message.message}</td></tr><tr><td width="120">出错时间</td><td>${message.lastTime}</td></tr></tbody></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.interface} 数据解析失败`, emailContent, message.type);
      break;
    case 'bid':
      let emailContent = '<table border="1" cellpadding="0" cellspacing="0" style="boder:1px #000 solid; background: rgba(255, 0, 90, 0.55);">';
      emailContent += `<tbody><tr><td width="120">平台</td><td>${message.platform}</td></tr><tr><td width="120">用户ID</td><td>${message.bid}</td></tr><tr><td width="120">用户名称</td><td>${message.bname}</td></tr>`;
      emailContent += `<tr><td width="120">接口类型</td><td>${message.typeErr}:${message.interface}</td></tr><tr><td width="120">接口</td><td>${message.url}</td></tr>`;
      emailContent += `<tr><td width="120">错误信息</td><td>${message.message}</td></tr><tr><td width="120">出错时间</td><td>${message.lastTime}</td></tr></tbody></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.bname} 用户可能不存在(或者接口有变化)`, emailContent, message.type);
      break;
    case 'data':
      let emailContent = '<table border="1" cellpadding="0" cellspacing="0" style="boder:1px #000 solid; background: rgba(211, 255, 0, 0.44);">';
      emailContent += `<tbody><tr><td width="120">平台</td><td>${message.platform}</td></tr><tr><td width="120">用户ID</td><td>${message.bid}</td></tr><tr><td width="120">用户名称</td><td>${message.bname}</td></tr>`;
      emailContent += `<tr><td width="120">接口类型</td><td>${message.typeErr}:${message.interface}</td></tr><tr><td width="120">接口</td><td>${message.url}</td></tr>`;
      emailContent += `<tr><td width="120">错误信息</td><td>${message.message}</td></tr><tr><td width="120">出错时间</td><td>${message.lastTime}</td></tr></tbody></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.interface} 数据返回格式异常`, emailContent, message.type);
      break;
    case 'NoError':
      let emailContent = '<table border="1" cellpadding="0" cellspacing="0" style="boder:1px #000 solid; background: rgba(255, 0, 90, 0.55);">';
      emailContent += `<tbody><tr><td>平台</td><td>${message.platform}</td></tr><tr><td>用户ID</td><td>${message.bid}</td></tr><tr><td>用户名称</td><td>${message.bname}</td></tr>`;
      emailContent += `<tr><td>接口类型</td><td>${message.typeErr}:${message.interface}</td></tr><tr><td>接口</td><td>${message.url}</td></tr>`;
      emailContent += `<tr><td>错误信息</td><td>${message.message}</td></tr><tr><td>出错时间</td><td>${message.lastTime}</td></tr></tbody></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.interface} 数据返回格式异常`, emailContent, message.type);
      break;
    case 'p-error':
      emailContent = `<table><tr><td colspan="3">异常错误导致发送报警</td></tr><tr style="background: rgba(255, 0, 90, 0.55);"><td>平台：${message.p}</td><td>错误信息：${message.error}</td><td>错误时间：${message.time}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.interface} 数据返回格式异常`, emailContent, message.type);
      break;
    default:
      events.emit('error', { error: '无法判断是什么类型的错误', platform: message.platform, bid: message.bid });
      break;
  }
  events = null;
  message = null;
};
