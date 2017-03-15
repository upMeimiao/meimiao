/**
 * Created by ifable on 2017/3/8.
 */
const Redis = require('ioredis')
const pidMap = require('../../taskArray')

const redis = new Redis(`redis://:C19prsPjHs52CHoA0vm@127.0.0.1:6379/3`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})

exports.getAid = (req, res) => {
    const p = req.query.p,
        bid = pidMap.get(Number(p)),
        key = `c:${p}:${bid}`
    redis.smembers(key, (err, result) => {
        if(err){
            return res.status(502).json({status: false})
        }
        let list = []
        for (let [index, elem] of result.entries()) {
            list.push({
                p: p,
                bid: bid,
                aid: elem
            })
        }
        let info = {
            status: true,
            aidNumber: result.length,
            aidList: list
        }
        res.status(200).json(info)
    })
}
exports.getCommentList = (req, res) => {
    const p = req.query.p,
        bid = pidMap.get(Number(p)),
        aid = req.query.aid,
        key = `c:${p}:${bid}:${aid}`
    redis.smembers(key, (err, result) => {
        if(err){
            return res.status(502).json({status: false})
        }
        let list = []
        for (let [index, elem] of result.entries()) {
            list.push(JSON.parse(elem))
        }
        res.status(200).json({status: true, commentsNumber: list.length, commentsList: list})
    })
}