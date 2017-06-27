/**
 * Created by zhupenghui on 2017/6/13.
 *
 * 进行邮件发送功能
 * 当有错误报告产生的时候需要按照级别进行不同等级的邮件发送
 * red      ===》 突发性质导致数据出错
 * blue     ===》 本地接口请求出错
 * yellow   ===》 对方服务器挂掉了
 */
const nodemailer = require('nodemailer');
const logging = require('log4js');
let logger = logging.getLogger('报警邮件');

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 10,
  service: 'QQex', // no need to set host or port etc.
  auth: {
    user: 'zhupenghui@meimiao.net',
    pass: 'Zhupenghui123'
  }
});
/**
 * 当错误发生时发送邮件报警
 * */
exports.sendEmail = (title, content, type) => {
  const mailOptions = {
    from: '"朱鹏辉" <zhupenghui@meimiao.net>',
    to: [ '1425423221@qq.com'], // list of receivers
    subject: title, // Subject line
    text: content, // plaintext body
    html: content // html body
  };
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.log('error in sending Email', error);
    }
    title = null;
    content = null;
  });
};
