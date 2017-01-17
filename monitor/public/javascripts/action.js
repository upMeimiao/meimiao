const platformMap = new Map([
    [1,'优酷'],
    [2,'爱奇艺'],
    [3,'乐视'],
    [4,'腾讯'],
    [5,'美拍'],
    [6,'头条'],
    [7,'秒拍'],
    [8,'哔哩'],
    [9,'搜狐'],
    [10,'快报'],
    [11,'一点'],
    [12,'土豆'],
    [13,'爆米花'],
    [14,'酷6'],
    [15,'北时'],
    [16,'微视'],
    [17,'小影'],
    [18,'不得姐'],
    [19,'内涵'],
    [20,'YY'],
    [21,'56TV'],
    [22,'AcFun'],
    [23,'微博'],
    [24,'凤凰号'],
    [25,'网易号'],
    [26,'UC'],
    [27,'芒果'],
    [28,'百家'],
    [29,'Qzone'],
    [30,'CCTV'],
    [31,'PPTV'],
    [32,'新蓝网'],
    [33,'第一视频'],
    [34,'风行网'],
    [35,'华数TV'],
    [36,'暴风影音'],
    [37,'百度视频']
])
const platform = [
    {id:1,name:'优酷'},
    {id:2,name:'爱奇艺'},
    {id:3,name:'乐视'},
    {id:4,name:'腾讯'},
    {id:5,name:'美拍'},
    {id:6,name:'今日头条'},
    {id:7,name:'秒拍'},
    {id:8,name:'哔哩哔哩'},
    {id:9,name:'搜狐'},
    {id:10,name:'快报'},
    {id:11,name:'一点资讯'},
    {id:12,name:'土豆'},
    {id:13,name:'爆米花'},
    {id:14,name:'酷6'},
    {id:15,name:'北京时间'},
    {id:16,name:'微视'},
    {id:17,name:'小影'},
    {id:18,name:'百思不得姐'},
    {id:19,name:'内涵段子'},
    {id:20,name:'YY'},
    {id:21,name:'56TV'},
    {id:22,name:'AcFun'},
    {id:23,name:'微博'},
    {id:24,name:'凤凰号'},
    {id:25,name:'网易号'},
    {id:26,name:'UC头条'},
    {id:27,name:'芒果TV'},
    {id:28,name:'百家号'},
    {id:29,name:'QQ空间'},
    {id:30,name:'CCTV'},
    {id:31,name:'PPTV'},
    {id:32,name:'新蓝网'},
    {id:33,name:'第一视频'},
    {id:34,name:'风行网'},
    {id:35,name:'华数TV'},
    {id:36,name:'暴风影音'},
    {id:37,name:'百度视频'}
]
const vm = new Vue({
    el: '#app',
    data: {
        loading: true,
        platform: platform,
        radio: 1,
        input: '',
        select: '1',
        arr1: [],
        arr2: [],
        arr3: [],
        arr4: [],
        arr5: [],
        arr6: [],
        arr7: [],
        arr8: [],
        arr9: [],
        arr10: [],
        arr11: [],
        arr12: [],
        arr13: [],
        arr14: [],
        arr15: [],
        arr16: [],
        arr17: [],
        arr18: [],
        arr19: [],
        arr20: [],
        arr21: [],
        arr22: [],
        arr23: [],
        arr24: [],
        arr25: [],
        arr26: [],
        arr27: [],
        arr28: [],
        arr29: [],
        arr30: [],
        arr31: [],
        arr32: [],
        arr33: [],
        arr34: [],
        arr35: [],
        arr36: [],
        arr37: [],
        items: [],
        bingo: [],
        infos: []
    },
    filters: {
    },
    methods: {
        changePlatform: function (lab) {
            this.dispath(lab)
            this.$message({
                message: `获取 ${platformMap.get(lab)} ${this.items.length} 个IP`,
                type: 'success'
            })
        },
        show_pname: function (row, colomn) {
            return platformMap.get(Number(row.p))
        },
        show_s_time: function (row, column) {
            if(column.property == 'post_t'){
                if(!row.post_t){
                    return '-'
                }
                return moment(moment.unix(row.post_t)).format('YYYY-MM-D H:mm:ss')
            }
            if(column.property == 'update_t'){
                if(!row.update_t){
                    return '-'
                }
                return moment(moment.unix(row.update_t)).format('YYYY-MM-D H:mm:ss')
            }
        },
        show_time: function (row, column) {
            if(column.property == 'init'){
                if(!row.update){
                    return '-'
                }
                return moment(moment.unix(row.init/1000)).format('YYYY-MM-D H:mm:ss')
            }
            if(column.property == 'create'){
                if(!row.update){
                    return '-'
                }
                return moment(moment.unix(row.create/1000)).format('YYYY-MM-D H:mm:ss')
            }
            if(column.property == 'update'){
                if(!row.update){
                    return '-'
                }
                return moment(moment.unix(row.update/1000)).format('YYYY-MM-D H:mm:ss')
            }
        },
        show_status: function (row, column) {
            if(row.is_post == 0){
                return '是'
            }
            if(row.is_post == 1){
                return '否'
            }
        },
        tableRowClassName: function(row, index) {
            if (row.is_post == 1) {
                return 'info-row'
            }
            return ''
        },
        filterStatus: function (value, row) {
            return Number(row.is_post) === value
        },
        search: function () {
            if(this.input == '' || this.select == ''){
                return this.items = this.bingo
            }
            let list = []
            if(this.select == 1){
                this.infos.find((value, index, arr) => {
                    if(value.bid == this.input){
                        list.push(value)
                    }
                })
            }
            if(this.select == 2){
                this.infos.find((value, index, arr) => {
                    if(value.bname.includes(this.input)){
                        list.push(value)
                    }
                })
            }
            this.items = list
            this.$message({
                message: `搜索到符合条件的IP${this.items.length}个`,
                type: 'success'
            })
        },
        init: function () {
            this.items = []
            this.bingo = []
            this.arr1 = []
            this.arr2 = []
            this.arr3 = []
            this.arr4 = []
            this.arr5 = []
            this.arr6 = []
            this.arr7 = []
            this.arr8 = []
            this.arr9 = []
            this.arr10 = []
            this.arr11 = []
            this.arr12 = []
            this.arr13 = []
            this.arr14 = []
            this.arr15 = []
            this.arr16 = []
            this.arr17 = []
            this.arr18 = []
            this.arr19 = []
            this.arr20 = []
            this.arr21 = []
            this.arr22 = []
            this.arr23 = []
            this.arr24 = []
            this.arr25 = []
            this.arr26 = []
            this.arr27 = []
            this.arr28 = []
            this.arr29 = []
            this.arr30 = []
            this.arr31 = []
            this.arr32 = []
            this.arr33 = []
            this.arr34 = []
            this.arr35 = []
            this.arr36 = []
            this.arr37 = []
        },
        dispath: function (p) {
            switch (p){
                case 1:
                    this.items = this.bingo = this.arr1
                    break
                case 2:
                    this.items = this.bingo = this.arr2
                    break
                case 3:
                    this.items = this.bingo = this.arr3
                    break
                case 4:
                    this.items = this.bingo = this.arr4
                    break
                case 5:
                    this.items = this.bingo = this.arr5
                    break
                case 6:
                    this.items = this.bingo = this.arr6
                    break
                case 7:
                    this.items = this.bingo = this.arr7
                    break
                case 8:
                    this.items = this.bingo = this.arr8
                    break
                case 9:
                    this.items = this.bingo = this.arr9
                    break
                case 10:
                    this.items = this.bingo = this.arr10
                    break
                case 11:
                    this.items = this.bingo = this.arr11
                    break
                case 12:
                    this.items = this.bingo = this.arr12
                    break
                case 13:
                    this.items = this.bingo = this.arr13
                    break
                case 14:
                    this.items = this.bingo = this.arr14
                    break
                case 15:
                    this.items = this.bingo = this.arr15
                    break
                case 16:
                    this.items = this.bingo = this.arr16
                    break
                case 17:
                    this.items = this.bingo = this.arr17
                    break
                case 18:
                    this.items = this.bingo = this.arr18
                    break
                case 19:
                    this.items = this.bingo = this.arr19
                    break
                case 20:
                    this.items = this.bingo = this.arr20
                    break
                case 21:
                    this.items = this.bingo = this.arr21
                    break
                case 22:
                    this.items = this.bingo = this.arr22
                    break
                case 23:
                    this.items = this.bingo = this.arr23
                    break
                case 24:
                    this.items = this.bingo = this.arr24
                    break
                case 25:
                    this.items = this.bingo = this.arr25
                    break
                case 26:
                    this.items = this.bingo = this.arr26
                    break
                case 27:
                    this.items = this.bingo = this.arr27
                    break
                case 28:
                    this.items = this.bingo = this.arr28
                    break
                case 29:
                    this.items = this.bingo = this.arr29
                    break
                case 30:
                    this.items = this.bingo = this.arr30
                    break
                case 31:
                    this.items = this.bingo = this.arr31
                    break
                case 32:
                    this.items = this.bingo = this.arr32
                    break
                case 33:
                    this.items = this.bingo = this.arr33
                    break
                case 34:
                    this.items = this.bingo = this.arr34
                    break
                case 35:
                    this.items = this.bingo = this.arr35
                    break
                case 36:
                    this.items = this.bingo = this.arr36
                    break
                case 37:
                    this.items = this.bingo = this.arr37
                    break
            }
        },
        refresh: function () {
            this.init()
            this.loading = true
            this.$http.get('http://spider-monitor.meimiaoip.com/api/statusMonitor').then((response) => {
                const result = response.body,
                    infos = result.infos
                if(infos.length !== result.count){
                    console.log('获取过程有错误')
                }
                this.infos = infos
                for (let [index, elem] of infos.entries()) {
                    switch (Number(elem.p)){
                        case 1:
                            this.arr1.push(elem)
                            break
                        case 2:
                            this.arr2.push(elem)
                            break
                        case 3:
                            this.arr3.push(elem)
                            break
                        case 4:
                            this.arr4.push(elem)
                            break
                        case 5:
                            this.arr5.push(elem)
                            break
                        case 6:
                            this.arr6.push(elem)
                            break
                        case 7:
                            this.arr7.push(elem)
                            break
                        case 8:
                            this.arr8.push(elem)
                            break
                        case 9:
                            this.arr9.push(elem)
                            break
                        case 10:
                            this.arr10.push(elem)
                            break
                        case 11:
                            this.arr11.push(elem)
                            break
                        case 12:
                            this.arr12.push(elem)
                            break
                        case 13:
                            this.arr13.push(elem)
                            break
                        case 14:
                            this.arr14.push(elem)
                            break
                        case 15:
                            this.arr15.push(elem)
                            break
                        case 16:
                            this.arr16.push(elem)
                            break
                        case 17:
                            this.arr17.push(elem)
                            break
                        case 18:
                            this.arr18.push(elem)
                            break
                        case 19:
                            this.arr19.push(elem)
                            break
                        case 20:
                            this.arr20.push(elem)
                            break
                        case 21:
                            this.arr21.push(elem)
                            break
                        case 22:
                            this.arr22.push(elem)
                            break
                        case 23:
                            this.arr23.push(elem)
                            break
                        case 24:
                            this.arr24.push(elem)
                            break
                        case 25:
                            this.arr25.push(elem)
                            break
                        case 26:
                            this.arr26.push(elem)
                            break
                        case 27:
                            this.arr27.push(elem)
                            break
                        case 28:
                            this.arr28.push(elem)
                            break
                        case 29:
                            this.arr29.push(elem)
                            break
                        case 30:
                            this.arr30.push(elem)
                            break
                        case 31:
                            this.arr31.push(elem)
                            break
                        case 32:
                            this.arr32.push(elem)
                            break
                        case 33:
                            this.arr33.push(elem)
                            break
                        case 34:
                            this.arr34.push(elem)
                            break
                        case 35:
                            this.arr35.push(elem)
                            break
                        case 36:
                            this.arr36.push(elem)
                            break
                        case 37:
                            this.arr37.push(elem)
                            break
                    }
                }
                this.dispath(this.radio)
                this.loading = false
                this.$message({
                    message: `全平台共获取${this.infos.length}个IP，当前平台${this.items.length}个IP`,
                    type: 'success',
                    duration: 5000
                })
            }, (response) => {
                this.loading = false
                this.items = this.bingo = []
                this.$message({
                    message: '获取数据出错',
                    type: 'error',
                    duration: 10000
                })
                // error callback
            })
        }
    },
    created: function () {
        this.refresh()
        const socket = io.connect('ws://spider-monitor.meimiaoip.com/')
        socket.on('cache', (data) => {
            this.$notify.info({
                title: '暂存队列消息',
                message: `目前缓存队列中有${data.num}条数据`,
                duration: 360000
            })
        })
    },
    mounted: function () {

    }
})