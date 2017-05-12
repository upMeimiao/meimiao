const vm = new Vue({
  el: '#app',
  data: {
    loading: true,
    items: []
  },
  filters: {
  },
  methods: {
    goto: function (row) {
      window.open(`http://www.weibo.com/${row.user.id}/${row.bid}`, 'meimiaoip_hot_mblog')
    },
    refresh: function () {
      this.loading = true
      this.$http.get('http://spider-monitor.meimiaoip.com/api/hotWeibo').then((response) => {
        console.log(response)
        const result = response.body
        this.items = result.list
        this.loading = false
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
  },
  mounted: function () {

  }
})