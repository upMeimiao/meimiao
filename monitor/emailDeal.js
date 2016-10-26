/**
 * Created by ifable on 2016/10/6.
 */
const nodemailer = require('nodemailer')
//const transporter = nodemailer.createTransport('smtps://user%40gmail.com:pass@smtp.gmail.com')
const transporter= nodemailer.createTransport({
    service: 'QQex', // no need to set host or port etc.
    auth: {
        user: 'changjunhao@meimiao.net',
        pass: 'Verona:2319446'
    }
})
var mailOptions = {
    from: '"常君豪" <changjunhao@meimiao.net>', // sender address
    to: 'si_cheng_cool@126.com', // list of receivers
    subject: 'Hello', // Subject line
    text: 'Hello world', // plaintext body
    html: '<b>Hello world！</b>' // html body
};

// send mail with defined transport object
transporter.sendMail(mailOptions, function(error, info){
    if(error){
        return console.log(error);
    }
    console.log('Message sent: ' + info.response);
});