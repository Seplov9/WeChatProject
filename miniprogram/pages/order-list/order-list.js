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
    pageType: "",
    pageTitle: "",
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
    rawList: [],
    filteredList: [],
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

  onLoad(options) {
    const type = options.type || "myOrders";
    const titles = {
      myOrders: "我的发布",
      favorites: "我的收藏",
      history: "浏览记录",
    };
    this.setData({
      pageType: type,
      pageTitle: titles[type] || "",
      categoryOptions: this.data.categoryOptions,
    });
    wx.setNavigationBarTitle({ title: this.data.pageTitle });
    this.fetchData();
  },

  fetchData() {
    const type = this.data.pageType;
    const cloudTypes = {
      myOrders: "getMyOrders",
      favorites: "getFavorites",
      history: "getHistory",
    };
    wx.showLoading({ title: "加载中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: { type: cloudTypes[type] },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          this.setData({ rawList: resp.result.data });
          this.applyFilters();
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  buildCategoryOptions(onlineIndex) {
    if (onlineIndex === 0) return this.data.categoryOptions;
    if (onlineIndex === 1) return ["分类"].concat(this.data.onlineCategories);
    return ["分类"].concat(this.data.offlineCategories);
  },

  applyFilters() {
    let list = this.data.rawList;
    const { keyword, roleIndex, onlineIndex, categoryIndex, provinceIndex, cityIndex, districtIndex } = this.data;
    const type = this.data.pageType;

    // 身份筛选（仅对我的发布生效）
    if (roleIndex > 0 && type === "myOrders") {
      const roleVal = roleIndex === 1 ? "b" : "a";
      list = list.filter((item) => item.role === roleVal);
    }

    const getCat = (item) =>
      type === "myOrders" ? (item.category || "") : (item.orderSnapshot && item.orderSnapshot.category) || "";
    const getTitle = (item) =>
      type === "myOrders" ? (item.title || "") : (item.orderSnapshot && item.orderSnapshot.title) || "";
    const getContent = (item) =>
      type === "myOrders" ? (item.content || "") : (item.orderSnapshot && item.orderSnapshot.content) || "";
    const getCity = (item) =>
      type === "myOrders" ? (item.city || "") : (item.orderSnapshot && item.orderSnapshot.city) || "";

    if (keyword) {
      const kw = keyword.toLowerCase();
      list = list.filter((item) => {
        const t = getTitle(item);
        const c = getContent(item);
        return (t && t.toLowerCase().includes(kw)) || (c && c.toLowerCase().includes(kw));
      });
    }

    if (onlineIndex === 1) {
      list = list.filter((item) => this.data.onlineCategories.includes(getCat(item)));
    } else if (onlineIndex === 2) {
      list = list.filter((item) => !this.data.onlineCategories.includes(getCat(item)));
    }

    if (categoryIndex > 0) {
      const cat = this.data.categoryOptions[categoryIndex];
      list = list.filter((item) => getCat(item) === cat);
    }

    if (provinceIndex > 0) {
      const p = this.data.provinceOptions[provinceIndex];
      list = list.filter((item) => getCity(item) && getCity(item).includes(p));
    }
    if (cityIndex > 0) {
      const c = this.data.cityOptions[cityIndex];
      list = list.filter((item) => getCity(item) && getCity(item).includes(c));
    }
    if (districtIndex > 0) {
      const d = this.data.districtOptions[districtIndex];
      list = list.filter((item) => getCity(item) && getCity(item).includes(d));
    }

    this.setData({ filteredList: list });
  },

  onSearchInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.applyFilters(); },

  onRoleChange(e) {
    this.setData({ roleIndex: Number(e.detail.value) });
    this.applyFilters();
  },

  onOnlineChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      onlineIndex: idx,
      categoryIndex: 0,
      categoryOptions: this.buildCategoryOptions(idx),
      provinceIndex: 0,
      cityOptions: ["全部"],
      cityIndex: 0,
      districtOptions: ["全部"],
      districtIndex: 0,
    });
    this.applyFilters();
  },
  onCategoryChange(e) { this.setData({ categoryIndex: Number(e.detail.value) }); this.applyFilters(); },

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

  onCardTap(e) {
    const item = this.data.filteredList[e.currentTarget.dataset.index];
    if (!item) return;

    if (this.data.pageType === "myOrders") {
      const app = getApp();
      app.globalData.pendingEditId = item._id;
      app.globalData.pendingEditRole = item.role || "a";
      wx.switchTab({ url: "/pages/post/post" });
    } else {
      const role = item.orderSnapshot && item.orderSnapshot.role ? item.orderSnapshot.role : "a";
      wx.navigateTo({ url: `/pages/show/show?orderId=${item.orderId}&role=${role}` });
    }
  },
});
