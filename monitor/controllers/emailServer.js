/**
 * Created by ifable on 2016/10/6.
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'QQex', // no need to set host or port etc.
  auth: {
    user: 'changjunhao@meimiao.net',
    pass: 'Verona:2319446'
  }
});
exports.sendAlarm = (subject, content) => {
  const mailOptions = {
    from: '"常君豪" <changjunhao@meimiao.net>', // sender address
    to: ['changjunhao@meimiao.net', 'zhupenghui@meimiao.net'], // list of receivers
    subject, // Subject line
    text: content, // plaintext body
    html: content // html body
  };
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.log(error);
    }
  });
};
exports.sendEmail = (req, res) => {
  const mailOptions = {
    from: '"常君豪" <changjunhao@meimiao.net>', // sender address
    to: ['changjunhao@meimiao.net', 'luoqibu@meimiao.net', 'limojin@meimiao.net'], // list of receivers
    subject: req.body.subject, // Subject line
    text: req.body.content, // plaintext body
    html: req.body.content // html body
  };

// send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.status(500).json({ error });
      return;
    }
    res.json({ message: info.response });
  });
};