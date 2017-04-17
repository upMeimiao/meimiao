const router = require('express').Router()
const restc = require('restc')
const cors = require('cors')
const apiController = require('../controllers/api')
const emailServer = require('../controllers/emailServer')
const commentCon = require('../controllers/comment')
const yitiao = require('../controllers/yitiao')
const uctt = require('../controllers/uctt')

// const apiCon = new ApiController();
router.use(restc.express())
router.use(cors({
    origin: ['http://spider-monitor.meimiaoip.com','http://spider-monitor.caihongip.com','http://localhost:3001'],
    methods: ['GET', 'POST'],
    alloweHeaders: ['Conten-Type', 'Authorization'],
}))
router.use((req, res, next) => {
    next()
})
/* GET home API. */
router.get('/', (req, res) => {
    res.json({ status: 'My Api is alive!' })
})
router.route('/statusMonitor')
    .all((req, res, next) => {
      // runs for all HTTP verbs first
      // think of it as route specific middleware!
      next()
    })
    .get(apiController.findData)
router.route('/changeStatus')
    .get((req, res) => {
        res.status(405).send()
    })
    .post(apiController.changeStatus)
router.route('/alarm')
    .get((req, res) => {
        res.status(405).send()
    })
    .post(emailServer.sendEmail)
router.get('/aid', commentCon.getAid)
router.get('/commentList', commentCon.getCommentList)
router.get('/yitiao', yitiao.getMedia)
router.get('/uctt', uctt.getAids)
module.exports = router
