Page({
  data: {
    order: null,
    isFaved: false,
  },

  onLoad(options) {
    if (options && options.orderId) {
      this.loadOrder(options.orderId, options.role || "a");
      this.checkFavorite(options.orderId);
    }
  },

  checkFavorite(orderId) {
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: { type: "getFavorites" },
      })
      .then((resp) => {
        if (resp.result.success) {
          const faved = resp.result.data.some((item) => item.orderId === orderId);
          this.setData({ isFaved: faved });
        }
      })
      .catch(() => {});
  },

  loadOrder(orderId, role) {
    wx.showLoading({ title: "加载中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: { type: "getOrderById", orderId, role },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          const o = resp.result.data;
          o.createdAt = this.formatTime(o.createdAt);
          this.setData({ order: o });
        } else {
          wx.showToast({ title: "加载失败", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  formatTime(date) {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.order.images || [];
    wx.previewImage({ current: url, urls });
  },

  onToggleFav() {
    const o = this.data.order;
    if (!o || !o._id) return;

    const newFaved = !this.data.isFaved;
    this.setData({ isFaved: newFaved });

    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "toggleFavorite",
          orderId: o._id,
          orderSnapshot: {
            role: o.role || "a",
            category: o.category,
            title: o.title,
            content: o.content,
            reward: o.reward,
            contact: o.contact,
            city: o.city,
            images: o.images || [],
          },
        },
      })
      .catch(() => {});
  },

  onTapPublisher() {
    const o = this.data.order;
    if (!o || !o.publisherId) return;
    wx.navigateTo({
      url: `/pages/publisher/publisher?publisherId=${o.publisherId}&publisherName=${encodeURIComponent(o.publisherName || '')}&publisherAvatar=${encodeURIComponent(o.publisherAvatar || '')}`,
    });
  },
});
