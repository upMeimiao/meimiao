const platformMap = new Map([
    [1, '优酷'],
    [2, '爱奇艺'],
    [3, '乐视'],
    [4, '腾讯'],
    [5, '美拍'],
    [6, '头条'],
    [7, '秒拍'],
    [8, '哔哩'],
    [9, '搜狐'],
    [10, '快报'],
    [11, '一点'],
    [12, '土豆'],
    [13, '爆米花'],
    [14, '酷6'],
    [15, '北时'],
    [16, '微视'],
    [17, '小影'],
    [18, '不得姐'],
    [19, '内涵'],
    [20, 'YY'],
    [21, '56TV'],
    [22, 'AcFun'],
    [23, '微博'],
    [24, '凤凰号'],
    [25, '网易号'],
    [26, 'UC'],
    [27, '芒果'],
    [28, '百家'],
    [29, 'Qzone'],
    [30, 'CCTV'],
    [31, 'PPTV'],
    [32, '新蓝网'],
    [33, '第一视频'],
    [34, '风行网'],
    [35, '华数TV'],
    [36, '暴风影音'],
    [37, '百度视频'],
    [38, '梨视频'],
    [39, 'YouTube'],
    [40, 'Facebook'],
    [41, '人人视频']
]);
const platform = [
    { id: 1, name: '优酷' },
    { id: 2, name: '爱奇艺' },
    { id: 3, name: '乐视' },
    { id: 4, name: '腾讯' },
    { id: 5, name: '美拍' },
    { id: 6, name: '今日头条' },
    { id: 7, name: '秒拍' },
    { id: 8, name: '哔哩哔哩' },
    { id: 9, name: '搜狐' },
    { id: 10, name: '快报' },
    { id: 11, name: '一点资讯' },
    { id: 12, name: '土豆' },
    { id: 13, name: '爆米花' },
    { id: 14, name: '酷6' },
    { id: 15, name: '北京时间' },
    { id: 16, name: '微视' },
    { id: 17, name: '小影' },
    { id: 18, name: '百思不得姐' },
    { id: 19, name: '内涵段子' },
    { id: 20, name: 'YY' },
    { id: 21, name: '56TV' },
    { id: 22, name: 'AcFun' },
    { id: 23, name: '微博' },
    { id: 24, name: '凤凰号' },
    { id: 25, name: '网易号' },
    { id: 26, name: 'UC头条' },
    { id: 27, name: '芒果TV' },
    { id: 28, name: '百家号' },
    { id: 29, name: 'QQ空间' },
    { id: 30, name: 'CCTV' },
    { id: 31, name: 'PPTV' },
    { id: 32, name: '新蓝网' },
    { id: 33, name: '第一视频' },
    { id: 34, name: '风行网' },
    { id: 35, name: '华数TV' },
    { id: 36, name: '暴风影音' },
    { id: 37, name: '百度视频' },
    { id: 38, name: '梨视频' },
    { id: 39, name: 'YouTube' },
    { id: 40, name: 'Facebook' },
    { id: 41, name: '人人视频' }
];
const vm = new Vue({
  el: '#app',
  data: {
    loading: true,
    platform,
    radio: 1,
    input: '',
    select: '1',
    items: [],
    bingo: [],
    infos: []
  },
  filters: {
  },
  methods: {
    changePlatform(lab) {
      this.refresh();
    },
    show_pname(row, colomn) {
      return platformMap.get(Number(row.platform));
    },
    show_time(row, column) {
      return moment(moment.unix(row.ctime)).format('YYYY-MM-D H:mm:ss');
    },
    show_status(row, column) {
      if (row.is_post == 0) {
        return '是';
      }
      if (row.is_post == 1) {
        return '否';
      }
    },
    tableRowClassName(row, index) {
      if (row.is_post == 1) {
        return 'info-row';
      }
      return '';
    },
    filterStatus(value, row) {
      return Number(row.is_post) === value;
    },
    search() {
      if (this.input == '' || this.select == '') {
        return this.items = this.bingo;
      }
      const list = [];
      if (this.select == 1) {
        this.infos.find((value, index, arr) => {
          if (value.bid == this.input) {
            list.push(value);
          }
        });
      }
      if (this.select == 2) {
        this.infos.find((value, index, arr) => {
          if (value.bname.includes(this.input)) {
            list.push(value);
          }
        });
      }
      this.items = list;
      this.$message({
        message: `搜索到符合条件的IP${this.items.length}个`,
        type: 'success'
      });
    },
    refresh() {
      const a = location.href.split('comment/');
      const b = a[1].split('/');
      this.loading = true;
      this.$http.get(`/api/commentList?p=${b[0]}&aid=${b[1]}`).then((response) => {
        const result = response.body;
        this.items = result.commentsList;
        this.loading = false;
      }, (response) => {
        this.loading = false;
        this.items = this.bingo = [];
        this.$message({
          message: '获取数据出错',
          type: 'error',
          duration: 10000
        });
                // error callback
      });
    }
  },
  created() {
    this.refresh();
  },
  mounted() {

  }
});