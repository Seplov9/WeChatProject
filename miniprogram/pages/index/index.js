const { regions } = require("../../data/regions");

const MUNICIPALITIES = ["北京", "天津", "上海", "重庆"];

function isMunicipality(province) {
  return MUNICIPALITIES.includes(province);
}

function getCities(province) {
  if (isMunicipality(province)) return ["全部", province];
  const r = regions.find((r) => r.province === province);
  const cities = r ? r.cities.map((c) => c.city) : [];
  return ["全部"].concat(cities);
}

function getDistricts(province, city) {
  const r = regions.find((r) => r.province === province);
  if (!r) return ["全部"];
  if (isMunicipality(province) && city === province) {
    const districts = r.cities.map((c) => c.city);
    return ["全部"].concat(districts);
  }
  const c = r.cities.find((c) => c.city === city);
  const districts = c ? c.districts : [];
  return ["全部"].concat(districts);
}

function buildProvinceOptions() {
  return ["全部"].concat(regions.map((r) => r.province));
}

Page({
  data: {
    keyword: "",
    roleIndex: 0,
    roleOptions: ["身份", "“我可以”", "“我需要”"],
    onlineIndex: 0,
    onlineOptions: ["线上/线下", "线上", "线下"],
    categoryIndex: 0,
    categoryOptions: [
      "分类",
      "家政保洁", "家教辅导", "陪同陪诊", "摄影拍摄",
      "代办跑腿", "搬家运输", "其他线下",
      "游戏陪玩", "线上教学", "咨询规划", "设计制作", "其他线上",
    ],
    provinceIndex: 0,
    provinceOptions: buildProvinceOptions(),
    cityIndex: 0,
    cityOptions: ["全部"],
    districtIndex: 0,
    districtOptions: ["全部"],
    orders: [],
    filteredOrders: [],
    favoritedIds: {},
    hasMore: true,
    loadingMore: false,
    onlineCategories: [
      "游戏陪玩", "线上教学", "咨询规划", "设计制作", "其他线上",
    ],
    offlineCategories: [
      "家政保洁", "家教辅导", "陪同陪诊", "摄影拍摄",
      "代办跑腿", "搬家运输", "其他线下",
    ],
    allCategoryOptions: [
      "分类",
      "家政保洁", "家教辅导", "陪同陪诊", "摄影拍摄",
      "代办跑腿", "搬家运输", "其他线下",
      "游戏陪玩", "线上教学", "咨询规划", "设计制作", "其他线上",
    ],
  },

  PAGE_SIZE: 10,

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.setData({
      keyword: "",
      roleIndex: 0,
      onlineIndex: 0,
      categoryOptions: this.data.allCategoryOptions,
      categoryIndex: 0,
      provinceIndex: 0,
      cityOptions: ["全部"],
      cityIndex: 0,
      districtOptions: ["全部"],
      districtIndex: 0,
    });
    this.fetchFavorites();
    this.fetchOrders(true);
  },

  onPullDownRefresh() {
    this.fetchOrders(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    this.fetchOrders(false);
  },

  fetchFavorites() {
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: { type: "getFavorites" },
      })
      .then((resp) => {
        if (resp.result.success) {
          const map = {};
          resp.result.data.forEach((item) => {
            map[item.orderId] = true;
          });
          this.setData({ favoritedIds: map });
        }
      })
      .catch(() => {});
  },

  fetchOrders(reset) {
    if (reset) {
      this.setData({ orders: [], filteredOrders: [], hasMore: true, loadingMore: false });
      wx.showLoading({ title: "加载中..." });
    } else {
      if (!this.data.hasMore || this.data.loadingMore) return;
      this.setData({ loadingMore: true });
    }

    const skip = reset ? 0 : this.data.orders.length;
    const roleIndex = this.data.roleIndex;
    const roleFilter = roleIndex === 1 ? "a" : roleIndex === 2 ? "b" : "";

    return wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: { type: "getOrders", skip, pageSize: this.PAGE_SIZE, roleFilter },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          const newOrders = resp.result.data.map((item) => ({
            ...item,
            createdAt: this.formatTime(item.createdAt),
          }));
          const orders = reset ? newOrders : this.data.orders.concat(newOrders);
          this.setData({ orders, hasMore: resp.result.hasMore, loadingMore: false });
          this.applyFilters();
        } else {
          this.setData({ loadingMore: false });
          wx.showToast({ title: resp.result.errMsg || "加载失败", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        this.setData({ loadingMore: false });
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  formatTime(date) {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  applyFilters() {
    let list = this.data.orders;

    if (this.data.keyword) {
      const kw = this.data.keyword.toLowerCase();
      list = list.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(kw)) ||
          (item.content && item.content.toLowerCase().includes(kw))
      );
    }

    if (this.data.onlineIndex === 1) {
      list = list.filter((item) =>
        this.data.onlineCategories.includes(item.category)
      );
    } else if (this.data.onlineIndex === 2) {
      list = list.filter(
        (item) => !this.data.onlineCategories.includes(item.category)
      );
    }

    if (this.data.categoryIndex > 0) {
      const cat = this.data.categoryOptions[this.data.categoryIndex];
      list = list.filter((item) => item.category === cat);
    }

    if (this.data.provinceIndex > 0) {
      const p = this.data.provinceOptions[this.data.provinceIndex];
      list = list.filter((item) => item.city && item.city.includes(p));
    }
    if (this.data.cityIndex > 0) {
      const c = this.data.cityOptions[this.data.cityIndex];
      list = list.filter((item) => item.city && item.city.includes(c));
    }
    if (this.data.districtIndex > 0) {
      const d = this.data.districtOptions[this.data.districtIndex];
      list = list.filter((item) => item.city && item.city.includes(d));
    }

    list = list.map((item) => ({
      ...item,
      isFaved: !!this.data.favoritedIds[item._id],
    }));
    this.setData({ filteredOrders: list });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.applyFilters();
  },

  buildCategoryOptions(onlineIndex) {
    if (onlineIndex === 0) return this.data.allCategoryOptions;
    if (onlineIndex === 1) return ["分类"].concat(this.data.onlineCategories);
    return ["分类"].concat(this.data.offlineCategories);
  },

  onRoleChange(e) {
    this.setData({ roleIndex: Number(e.detail.value) });
    this.fetchOrders(true);
  },

  onOnlineChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      onlineIndex: idx,
      categoryOptions: this.buildCategoryOptions(idx),
      categoryIndex: 0,
      provinceIndex: 0,
      cityOptions: ["全部"],
      cityIndex: 0,
      districtOptions: ["全部"],
      districtIndex: 0,
    });
    this.applyFilters();
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) });
    this.applyFilters();
  },

  onProvinceChange(e) {
    const idx = Number(e.detail.value);
    const province = this.data.provinceOptions[idx];
    const cityList = idx > 0 ? getCities(province) : ["全部"];
    const districtList = cityList.length > 1 ? getDistricts(province, cityList[1]) : ["全部"];
    this.setData({
      provinceIndex: idx,
      cityOptions: cityList,
      cityIndex: 0,
      districtOptions: districtList,
      districtIndex: 0,
    });
    this.applyFilters();
  },

  onCityChange(e) {
    const idx = Number(e.detail.value);
    const city = this.data.cityOptions[idx];
    const province = this.data.provinceOptions[this.data.provinceIndex];
    const districtList = idx > 0 ? getDistricts(province, city) : ["全部"];
    this.setData({
      cityIndex: idx,
      districtOptions: districtList,
      districtIndex: 0,
    });
    this.applyFilters();
  },

  onDistrictChange(e) {
    this.setData({ districtIndex: Number(e.detail.value) });
    this.applyFilters();
  },

  onToggleFav(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.filteredOrders[idx];
    if (!item || !item._id) return;

    const newMap = { ...this.data.favoritedIds };
    const newFaved = !newMap[item._id];
    if (newFaved) {
      newMap[item._id] = true;
    } else {
      delete newMap[item._id];
    }

    this.setData({
      favoritedIds: newMap,
      [`filteredOrders[${idx}].isFaved`]: newFaved,
    });

    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "toggleFavorite",
          orderId: item._id,
          orderSnapshot: {
            role: item.role || "a",
            category: item.category,
            title: item.title,
            content: item.content,
            reward: item.reward,
            contact: item.contact,
            city: item.city,
            images: item.images || [],
          },
        },
      })
      .catch(() => {});
  },

  onCardTap(e) {
    const item = this.data.filteredOrders[e.currentTarget.dataset.index];
    if (!item || !item._id) return;

    wx.cloud.callFunction({
      name: "quickstartFunctions",
      data: {
        type: "recordHistory",
        orderId: item._id,
        orderSnapshot: {
          role: item.role || "a",
          category: item.category,
          title: item.title,
          content: item.content,
          reward: item.reward,
          contact: item.contact,
          city: item.city,
          images: item.images || [],
        },
      },
    }).catch(() => {});

    wx.navigateTo({ url: `/pages/show/show?orderId=${item._id}&role=${item.role || "a"}` });
  },
});
