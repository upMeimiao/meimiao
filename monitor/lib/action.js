const platformMap = new Map([
    [1,'优酷视频'],
    [2,'爱奇艺'],
    [3,'乐视'],
    [4,'腾讯视频'],
    [5,'美拍'],
    [6,'头条'],
    [7,'秒拍'],
    [8,'哔哩哔哩'],
    [9,'搜狐视频'],
    [10,'快报'],
    [11,'一点资讯'],
    [12,'土豆'],
    [13,'爆米花'],
    [14,'酷6'],
    [15,'北京时间'],
    [16,'微视'],
    [17,'小影'],
    [18,'百思不得姐'],
    [19,'内涵段子'],
    [20,'YY'],
    [21,'56视频'],
    [22,'AcFun'],
])
const pname = function (pid) {
    let name
    switch (Number(pid)){
        case 1:
            name = '优酷视频'
            break
        case 2:
            name = '爱奇艺'
            break
        case 3:
            name = '乐视视频'
            break
        case 4:
            name = '腾讯视频'
            break
        case 5:
            name = '美拍'
            break
        case 6:
            name = '今日头条'
            break
        case 7:
            name = '秒拍'
            break
        case 8:
            name = '哔哩哔哩'
            break
        case 9:
            name = '搜狐视频'
            break
        case 10:
            name = '天天快报'
            break
        case 11:
            name = '一点资讯'
            break
        case 12:
            name = '土豆视频'
            break
        case 13:
            name = '爆米花'
            break
        case 14:
            name = '酷6视频'
            break
        case 15:
            name = '北京时间'
            break
        case 16:
            name = '微视'
            break
        case 17:
            name = '小影'
            break
        case 18:
            name = '百思不得姐'
            break
        case 19:
            name = '内涵段子'
            break
        case 20:
            name = 'YY'
            break
        default:
            name = pid
            break
    }
    return name
}
const vm = new Vue({
    el: '#redis',
    data: {
        items: []
    },
    filters: {
        show_pname: function (value) {
            return platformMap.get(Number(value))
        },
        show_s_time: function (value) {
            if(!value){
                return '-'
            }
            return moment(moment.unix(value)).format('YYYY-MM-D H:mm:ss')
        },
        show_time: function (value) {
            if(!value){
                return '-'
            }
            return moment(moment.unix(value/1000)).format('YYYY-MM-D H:mm:ss')
        },
        show_status: function (value) {
            if(value == 0){
                return '是'
            }
            if(value == 1){
                return '否'
            }
        }
    },
    methods: {

    },
    created: function () {
        this.$http.get('http://monitor.iapi.site/api/get/data').then((response) => {
            const result = response.body,
                infos = result.infos
            if(infos.length !== result.count){
                console.log('获取过程有错误')
            }
            this.items = infos
        }, (response) => {
            // error callback
        })
    },
    mounted: function () {

    }
})