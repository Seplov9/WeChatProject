Page({
  data: {
    isLogin: false,
    displayName: "请登录",
    avatarUrl: "",
    nickName: "",
    showLoginPopup: false,
    agreed: false,
    tempAvatarUrl: "",
    tempNickName: "",
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  onProfileBoxTap() {
    if (!this.data.isLogin) {
      this.setData({
        showLoginPopup: true,
        agreed: false,
        tempAvatarUrl: "",
        tempNickName: "",
      });
    }
  },

  onHideLoginPopup() {
    this.setData({ showLoginPopup: false });
  },

  onChooseAvatar(e) {
    this.setData({ tempAvatarUrl: e.detail.avatarUrl });
  },

  onNicknameInput(e) {
    this.setData({ tempNickName: e.detail.value });
  },

  onConfirmTap() {
    if (!this.data.agreed) {
      wx.showToast({ title: "请先阅读并同意", icon: "none" });
      return;
    }
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  onConfirmLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: "请先阅读并同意", icon: "none" });
      return;
    }
    if (!this.data.tempAvatarUrl || !this.data.tempNickName) {
      wx.showToast({ title: "请完善头像和昵称", icon: "none" });
      return;
    }
    wx.showLoading({ title: "登录中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "saveUser",
          nickName: this.data.tempNickName,
          avatarUrl: this.data.tempAvatarUrl,
        },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          this.setData({
            isLogin: true,
            avatarUrl: this.data.tempAvatarUrl,
            nickName: this.data.tempNickName,
            displayName: this.data.tempNickName,
            showLoginPopup: false,
          });
          wx.showToast({ title: "登录成功" });
        } else {
          wx.showToast({ title: "登录失败", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "登录失败", icon: "none" });
      });
  },

  onLogout() {
    this.setData({
      isLogin: false,
      displayName: "请登录",
      avatarUrl: "",
      nickName: "",
    });
  },
});
