Page({
  data: {
    list: [],
  },

  onShow() {
    this.fetchData();
  },

  fetchData() {
    wx.showLoading({ title: "加载中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "getUserData",
        },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          this.setData({ list: resp.result.data });
        } else {
          wx.showToast({ title: "加载失败", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },
});
