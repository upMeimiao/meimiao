/**
*  Create by zhupenghui on 2017/6/13.
* */

const sendEmail = require('./sendEmail');

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
  let emailContent = '<table><tr><th>平台</th><th>用户ID</th><th>用户名称</th><th>接口类型</th><th>接口</th><th>错误信息</th></tr>';
  switch (message.typeErr) {
    case 'error':
      emailContent += `<tr style="background: red;"><td>${message.platfrom}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}</td><td>${message.interface}</td><td>${message.url}</td><td>${message.message}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 接口请求出错`, emailContent);
      break;
    case 'status':
      if (message.typeErr < 500 && message.typeErr >= 400) {
        emailContent += `<tr style="background: blue;"><td>${message.platfrom}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}</td><td>${message.interface}</td><td>${message.url}</td><td>${message.message}</td></tr></table>`;
        sendEmail.sendEmail(`${message.platform}平台 接口请求400状态`, emailContent);
      } else {
        emailContent += `<tr style="background: yellow;"><td>${message.platfrom}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}</td><td>${message.url}</td><td>${message.message}</td></tr></table>`;
        sendEmail.sendEmail(`${message.platform}平台 接口请求${message.typeErr}状态`, emailContent);
      }
      break;
    case 'json':
      emailContent += `<tr style="background: yellow;"><td>${message.platfrom}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}</td><td>${message.interface}</td><td>${message.url}</td><td>${message.message}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.interface} 数据解析失败`, emailContent);
      break;
    case 'bid':
      emailContent += `<tr style="background: red;"><td>${message.platfrom}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}</td><td>${message.interface}</td><td>${message.url}</td><td>${message.message}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.bname} 用户可能不存在`, emailContent);
      break;
    case 'data':
      emailContent += `<tr style="background: yellow;"><td>${message.platfrom}</td><td>${message.bid}</td><td>${message.bname}</td><td>${message.typeErr}</td><td>${message.interface}</td><td>${message.url}</td><td>${message.message}</td></tr></table>`;
      sendEmail.sendEmail(`${message.platform}平台 ${message.interface} 数据返回异常`, emailContent);
      break;
    default:
      events.emit('error', { error: '无法判断是什么类型的错误', platfrom: message.platfrom, bid: message.bid });
      return;
  }
};
