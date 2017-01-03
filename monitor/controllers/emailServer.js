/**
 * Created by ifable on 2016/10/6.
 */
const nodemailer = require('nodemailer')

const transporter= nodemailer.createTransport({
    service: 'QQex', // no need to set host or port etc.
    auth: {
        user: 'changjunhao@meimiao.net',
        pass: 'Verona:2319446'
    }
})
exports.sendAlarm = (subject, content) => {
    const mailOptions = {
        from: '"常君豪" <changjunhao@meimiao.net>', // sender address
        to: 'changjunhao@meimiao.net', // list of receivers
        subject: subject, // Subject line
        text: content, // plaintext body
        html: content // html body
    }
    transporter.sendMail(mailOptions, (error, info) => {
        if(error){

        }
    })
}
exports.sendEmail = (req, res) => {
    const mailOptions = {
        from: '"常君豪" <changjunhao@meimiao.net>', // sender address
        to: 'changjunhao@meimiao.net', // list of receivers
        subject: '报警', // Subject line
        text: '测试', // plaintext body
        html: `<b>测试</b>` // html body
    }

// send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if(error){
            return res.status(500).json({error: error})
        }
        res.json({message: info.response})
    })
}