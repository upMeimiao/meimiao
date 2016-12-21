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
const platform = [
    {id:1,name:'优酷'},
    {id:2,name:'爱奇艺'},
    {id:3,name:'乐视'},
    {id:4,name:'腾讯'},
    {id:5,name:'美拍'},
    {id:6,name:'头条'},
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
    {id:29,name:'QQ空间'}
]
const vm = new Vue({
    el: '#app',
    data: {
        loading: true,
        platform: platform,
        radio: 1,
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
        items: []
    },
    filters: {
    },
    methods: {
        changePlatform: function (lab) {
           switch (lab){
               case 1:
                   this.items = this.arr1
                   break
               case 2:
                   this.items = this.arr2
                   break
               case 3:
                   this.items = this.arr3
                   break
               case 4:
                   this.items = this.arr4
                   break
               case 5:
                   this.items = this.arr5
                   break
               case 6:
                   this.items = this.arr6
                   break
               case 7:
                   this.items = this.arr7
                   break
               case 8:
                   this.items = this.arr8
                   break
               case 9:
                   this.items = this.arr9
                   break
               case 10:
                   this.items = this.arr10
                   break
               case 11:
                   this.items = this.arr11
                   break
               case 12:
                   this.items = this.arr12
                   break
               case 13:
                   this.items = this.arr13
                   break
               case 14:
                   this.items = this.arr14
                   break
               case 15:
                   this.items = this.arr15
                   break
               case 16:
                   this.items = this.arr16
                   break
               case 17:
                   this.items = this.arr17
                   break
               case 18:
                   this.items = this.arr18
                   break
               case 19:
                   this.items = this.arr19
                   break
               case 20:
                   this.items = this.arr20
                   break
               case 21:
                   this.items = this.arr21
                   break
               case 22:
                   this.items = this.arr22
                   break
               case 23:
                   this.items = this.arr23
                   break
               case 24:
                   this.items = this.arr24
                   break
               case 25:
                   this.items = this.arr25
                   break
               case 26:
                   this.items = this.arr26
                   break
               case 27:
                   this.items = this.arr27
                   break
               case 28:
                   this.items = this.arr28
                   break
               case 29:
                   this.items = this.arr29
                   break
           }
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
        }
    },
    created: function () {
        this.$http.get('http://monitor.iapi.site/api/get/data').then((response) => {
            const result = response.body,
                infos = result.infos
            if(infos.length !== result.count){
                console.log('获取过程有错误')
            }
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
                }
            }
            this.items = this.arr1
            this.loading = false
        }, (response) => {
            // error callback
        })
    },
    mounted: function () {

    }
})