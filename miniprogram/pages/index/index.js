Page({
  data: {
    inputContent: "",
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onInput(e) {
    this.setData({ inputContent: e.detail.value });
  },

  submitData() {
    const content = this.data.inputContent.trim();
    if (!content) {
      wx.showToast({ title: "请输入内容", icon: "none" });
      return;
    }
    wx.showLoading({ title: "提交中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "addUserData",
          content,
        },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          wx.showToast({ title: "提交成功" });
          this.setData({ inputContent: "" });
        } else {
          wx.showToast({ title: "提交失败", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "提交失败", icon: "none" });
      });
  },

  goToShow() {
    wx.navigateTo({
      url: "/pages/show/show",
    });
  },
});
