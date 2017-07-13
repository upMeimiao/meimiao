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
  let emailContent = '<table border="1" cellpadding="0" cellspacing="0" style="boder:1px #000 solid; text-align: center"><tr><th width="80">平台</th><th width="140">用户ID</th><th width="160">用户名称</th><th width="80">接口类型</th><th width="220">接口</th><th width="150">错误信息</th><th width="100">出错时间</th></tr>';
  switch (message.typeErr) {
    case 'error':
      emailContent += `<tr style="background: rgba(255, 0, 90, 0.55);"><td>${message.platform}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}:${message.interface}</td><td>${message.url}</td><td>${message.message}</td><td>${message.lastTime}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 接口请求出错`, emailContent, message.type);
      break;
    case 'status':
      if (message.typeErr < 500 && message.typeErr >= 400) {
        emailContent += `<tr style="background: rgba(0, 74, 255, 0.42);"><td>${message.platform}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}:${message.interface}</td><td>${message.url}</td><td>${message.message}</td><td>${message.lastTime}</td></tr></table>`;
        sendEmail.sendEmail(`${message.platform}平台 接口请求400状态`, emailContent, message.type);
      } else {
        emailContent += `<tr style="background: rgba(211, 255, 0, 0.44);"><td>${message.platform}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}:${message.interface}</td><td>${message.url}</td><td>${message.message}</td><td>${message.lastTime}</td></tr></table>`;
        sendEmail.sendEmail(`${message.platform}平台 接口请求${message.typeErr}状态`, emailContent, message.type);
      }
      break;
    case 'json':
      emailContent += `<tr style="background: rgba(0, 74, 255, 0.42);"><td>${message.platform}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}:${message.interface}</td><td>${message.url}</td><td>${message.message}</td><td>${message.lastTime}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.interface} 数据解析失败`, emailContent, message.type);
      break;
    case 'bid':
      emailContent += `<tr style="background: rgba(255, 0, 90, 0.55);"><td>${message.platform}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}:${message.interface}</td><td>${message.url}</td><td>${message.message}</td><td>${message.lastTime}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.bname} 用户可能不存在(或者接口有变化)`, emailContent, message.type);
      break;
    case 'data':
      emailContent += `<tr style="background: rgba(211, 255, 0, 0.44);"><td>${message.platform}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}:${message.interface}</td><td>${message.url}</td><td>${message.message}</td><td>${message.lastTime}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.interface} 数据返回格式异常`, emailContent, message.type);
      break;
    case 'NoError':
      emailContent += `<tr style="background: rgba(255, 0, 90, 0.55);"><td>${message.platform}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.type}:${message.interface}</td><td>${message.url}</td><td>${message.message}</td><td>${message.lastTime}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.interface} 数据返回格式异常`, emailContent, message.type);
      break;
    default:
      events.emit('error', { error: '无法判断是什么类型的错误', platform: message.platform, bid: message.bid });
      break;
  }
  events = null;
  message = null;
};
