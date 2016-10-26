/**
 * Created by ifable on 2016/10/6.
 */
const nodemailer = require('nodemailer')

exports.sendEmail = ( subject, content ) => {
    const transporter= nodemailer.createTransport({
        service: 'QQex', // no need to set host or port etc.
        auth: {
            user: 'changjunhao@meimiao.net',
            pass: 'Verona:2319446'
        }
    })
    const mailOptions = {
        from: '"常君豪" <changjunhao@meimiao.net>', // sender address
        to: 'changjunhao@meimiao.net', // list of receivers
        subject: subject, // Subject line
        text: content, // plaintext body
        html: '<b>content</b>' // html body
    }

// send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
    })
}