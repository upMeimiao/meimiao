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
    [23,'微博'],
    [24,'凤凰号'],
    [25,'网易号'],
    [26,'UC头条'],
    [27,'芒果TV'],
    [28,'百家号'],
    [29,'QQ空间'],
])
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