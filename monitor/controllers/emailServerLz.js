/**
 * Created by ifable on 2017/1/22.
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 10,
  service: 'QQex', // no need to set host or port etc.
  auth: {
    user: 'changjunhao@meimiao.net',
    pass: 'Verona:2319446'
  }
});
exports.sendAlarm = (subject, content) => {
  const mailOptions = {
    from: '"常君豪" <changjunhao@meimiao.net>',
    to: ['changjunhao@meimiao.net', 'zhupenghui@meimiao.net', 'luoqibu@meimiao.net'], // list of receivers
    subject, // Subject line
    text: content, // plaintext body
    html: content // html body
  };
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.log('error in sending Email', error);
    }
  });
};