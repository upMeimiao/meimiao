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
  [41, '人人视频'],
  [42, '点视'],
  [44, '网易菠萝'],
  [45, '火山小视频']
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
  { id: 41, name: '人人视频' },
  { id: 42, name: '点视' },
  { id: 44, name: '网易菠萝' },
  { id: 45, name: '火山小视频' }
];
const vm = new Vue({
  el: '#app',
  data: {
    loading: true,
    platform,
    disabled: true,
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
    getSummaries(param) {
      const { columns, data } = param;
      const sums = [];
      columns.forEach((column, index) => {
        if (index === 0) {
          sums[index] = '合计';
          return;
        }
        if (index !== 3) {
          sums[index] = '';
          return;
        }
        const values = data.map(item => Number(item[column.property]));
        if (!values.every(value => isNaN(value))) {
          sums[index] = values.reduce((prev, curr) => {
            const value = Number(curr);
            if (!isNaN(value)) {
              return prev + curr;
            } else {
              return prev;
            }
          }, 0);
        } else {
          sums[index] = 'N/A';
        }
      });
      return sums;
    },
    changePlatform(lab) {
      this.refresh(lab);
    },
    show_pname(row, colomn) {
      return platformMap.get(Number(row.p));
    },
    show_s_time(row, column) {
      if (column.property === 'post_t') {
        if (!row.post_t) {
          return '-';
        }
        return moment(moment.unix(row.post_t)).format('YYYY-MM-D H:mm:ss');
      }
      if (column.property === 'update_t') {
        if (!row.update_t) {
          return '-';
        }
        return moment(moment.unix(row.update_t)).format('YYYY-MM-D H:mm:ss');
      }
    },
    show_time(row, column) {
      if (column.property === 'init') {
        if (!row.update) {
          return '-';
        }
        return moment(moment.unix(row.init / 1000)).format('YYYY-MM-D H:mm:ss');
      }
      if (column.property === 'create') {
        if (!row.update) {
          return '-';
        }
        return moment(moment.unix(row.create / 1000)).format('YYYY-MM-D H:mm:ss');
      }
      if (column.property === 'update') {
        if (!row.update) {
          return '-';
        }
        return moment(moment.unix(row.update / 1000)).format('YYYY-MM-D H:mm:ss');
      }
    },
    show_status(row, column) {
      if (Number(row.is_post) === 0) {
        return '是';
      }
      if (Number(row.is_post) === 1) {
        return '否';
      }
    },
    tableRowClassName(row, index) {
      if (Number(row.is_post) === 1) {
        return 'info-row';
      }
      return '';
    },
    filterStatus(value, row) {
      return Number(row.is_post) === value;
    },
    search() {
      if (this.input === '' || this.select === '') {
        return this.items = this.bingo;
      }
      const list = [];
      if (this.select === '1') {
        this.bingo.find((value, index, arr) => {
          if (value.bid === this.input) {
            list.push(value);
          }
        });
      }
      if (this.select === '2') {
        this.bingo.find((value, index, arr) => {
          if (value.bname.includes(this.input)) {
            list.push(value);
          }
        });
      }
      if (this.select === '3') {
        this.infos.find((value, index, arr) => {
          if (value.bid === this.input) {
            list.push(value);
          }
        });
      }
      if (this.select === '4') {
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
    init() {
      this.items = [];
      this.bingo = [];
    },
    refresh() {
      this.init();
      this.loading = true;
      fetch(`http://spider-monitor.meimiaoip.com/api/statusMonitor?p=${this.radio}`).then(response => response.json())
                .then((data) => {
                  const infos = data.infos;
                  if (infos.length !== data.count) {
                    console.log('获取过程有错误');
                  }
                  this.items = this.bingo = infos;
                  this.loading = false;
                  this.$message({
                    message: `获取 ${platformMap.get(this.radio)} ${this.items.length} 个IP`,
                    type: 'success',
                    duration: 5000
                  });
                }).catch((e) => {
                  this.loading = false;
                  this.items = this.bingo = [];
                  this.$message({
                    message: '获取数据出错',
                    type: 'error',
                    duration: 10000
                  });
                });
    }
  },
  created() {
    this.refresh();
    const socket = io.connect('ws://spider-monitor.meimiaoip.com/');
    socket.on('cache', (data) => {
      this.$notify.info({
        title: '暂存队列消息',
        message: `目前视频队列中有${data.videoNum}条数据，评论队列中有${data.commentNum}条数据`,
        duration: 360000
      });
    });
    const worker = new Worker('./javascripts/worker.js');
    worker.onmessage = (event) => {
      if (event.data.infos) {
        this.infos = event.data.infos;
        this.disabled = false;
        this.$notify({
          title: 'IP发现消息',
          message: `全平台共${this.infos.length}个IP`,
          duration: 360000,
          type: 'success'
        });
      } else {
        this.$notify({
          title: 'IP发现消息',
          message: '后台获取失败',
          duration: 360000,
          type: 'error'
        });
      }
    };
  },
  mounted() {

  }
});