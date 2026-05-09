Component({
  data: {
    selected: 0,
    list: [
      { pagePath: "/pages/index/index", text: "数据" },
      { pagePath: "/pages/profile/profile", text: "我的" },
    ],
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.list[index];
      wx.switchTab({ url: item.pagePath });
    },
  },
});
