/**
 * Created by ifable on 2017/1/22.
 */
const nodemailer = require('nodemailer')

const transporter= nodemailer.createTransport({
    pool: true,
    maxConnections: 10,
    service: 'QQex', // no need to set host or port etc.
    auth: {
        user: 'liuze@meimiao.net',
        pass: 'Lz0004202215'
    }
})
exports.sendAlarm = (subject, content) => {
    const mailOptions = {
        from: '"刘泽" <liuze@meimiao.net>', // sender address
        to: ["liuze@meimiao.net",
            "changjunhao@meimiao.net",
            "zhupenghui@meimiao.net","luoqibu@meimiao.net"], // list of receivers
        subject: subject, // Subject line
        text: content, // plaintext body
        html: content // html body
    }
    transporter.sendMail(mailOptions, (error, info) => {
        if(error){
            console.log("error in sending Email",error)
        }
    })
}
exports.sendEmail = (req, res) => {
    const mailOptions = {
        from: '"刘泽" <liuze@meimiao.net>', // sender address
        to: 'liuze@meimiao.net', // list of receivers
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