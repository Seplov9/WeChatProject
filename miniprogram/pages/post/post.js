const { regions } = require("../../data/regions");

// 直辖市列表
const MUNICIPALITIES = ["北京", "天津", "上海", "重庆"];

function isMunicipality(province) {
  return MUNICIPALITIES.includes(province);
}

// 发布页用：不含"全部"
function getCitiesForPost(province) {
  const r = regions.find((r) => r.province === province);
  if (!r) return [];
  return r.cities.filter((c) => c.city !== "全部").map((c) => c.city);
}

// 发布页用：不含"全部"
function getDistrictsForPost(province, city) {
  const r = regions.find((r) => r.province === province);
  if (!r) return [];
  const c = r.cities.find((c) => c.city === city);
  if (!c) return [];
  return c.districts.filter((d) => d !== "全部");
}

function buildProvinceOptionsForPost() {
  return ["省份"].concat(regions.map((r) => r.province));
}

Page({
  data: {
    statusBarHeight: 0,
    roleIndex: 0,
    roleOptions: ["身份", "“我可以”", "“我需要”"],
    onlineOptions: ["线上/线下", "线上", "线下"],
    onlineIndex: 0,
    categoryOptions: [
      "分类",
      "家政保洁", "家教辅导", "陪同陪诊", "摄影拍摄",
      "代办跑腿", "搬家运输", "其他线下",
      "游戏陪玩", "线上教学", "咨询规划", "设计制作", "其他线上",
    ],
    categoryIndex: 0,
    provinceOptions: buildProvinceOptionsForPost(),
    provinceIndex: 0,
    cityOptions: ["市/区"],
    cityIndex: 0,
    districtOptions: ["区"],
    districtIndex: 0,
    title: "",
    content: "",
    reward: "",
    contact: "",
    images: [],
    editId: "",
    editRole: "",
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
    this.setData({ statusBarHeight: wx.getSystemInfoSync().statusBarHeight });
    if (options && options.orderId) {
      this.setData({ editId: options.orderId, editRole: options.role || "a" });
      this.loadOrder(options.orderId, options.role || "a");
    }
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    const app = getApp();
    if (app.globalData.pendingEditId) {
      const id = app.globalData.pendingEditId;
      const role = app.globalData.pendingEditRole || "a";
      app.globalData.pendingEditId = null;
      app.globalData.pendingEditRole = null;
      this._fromCardEdit = true;
      this.setData({ editId: id, editRole: role });
      this.loadOrder(id, role);
    } else if (this._fromCardEdit && this.data.editId) {
      this._fromCardEdit = false;
      this.resetForm();
    } else if (!this.data.editId) {
      const draft = wx.getStorageSync("postDraft");
      if (draft) this.restoreDraft(draft);
    }
  },

  buildCategoryOptions(onlineIndex) {
    if (onlineIndex === 0) return this.data.allCategoryOptions;
    if (onlineIndex === 1) return ["分类"].concat(this.data.onlineCategories);
    return ["分类"].concat(this.data.offlineCategories);
  },

  resetForm() {
    this.setData({
      editId: "",
      editRole: "",
      roleIndex: 0,
      onlineIndex: 0,
      categoryOptions: this.data.allCategoryOptions,
      categoryIndex: 0,
      provinceIndex: 0,
      cityOptions: ["市/区"],
      cityIndex: 0,
      districtOptions: ["区"],
      districtIndex: 0,
      title: "",
      content: "",
      reward: "",
      contact: "",
      images: [],
    });
  },

  // 解析存储的 city 字段恢复省/市/区选择
  parseCityField(cityStr) {
    if (!cityStr) return { provIdx: 0, cityIdx: 0, distIdx: 0, cityOpts: ["市/区"], distOpts: ["区"] };
    const parts = cityStr.split("·");
    const provName = parts[0] || "";
    const secondName = parts[1] || "";
    const thirdName = parts[2] || "";

    const provIdx = this.data.provinceOptions.indexOf(provName);
    const pIdx = provIdx >= 0 ? provIdx : 0;

    let cityOpts = ["市/区"];
    let cityIdx = 0;
    let distOpts = ["区"];
    let distIdx = 0;

    if (pIdx > 0) {
      if (isMunicipality(provName)) {
        // 直辖市：下拉5=直辖市名(自动选中)，下拉6=区；cityValue格式"北京·朝阳区"
        cityOpts = ["市/区", provName];
        cityIdx = 1;
        const districts = getCitiesForPost(provName);
        distOpts = ["区"].concat(districts);
        distIdx = secondName ? distOpts.indexOf(secondName) : 0;
        if (distIdx < 0) distIdx = 0;
      } else {
        // 普通省：second 是市，third 是区
        cityOpts = ["市/区"].concat(getCitiesForPost(provName));
        cityIdx = cityOpts.indexOf(secondName);
        if (cityIdx < 0) cityIdx = 0;
        if (cityIdx > 0) {
          const districts = getDistrictsForPost(provName, secondName);
          distOpts = districts.length > 0 ? ["区"].concat(districts) : ["区"];
          distIdx = thirdName ? distOpts.indexOf(thirdName) : 0;
          if (distIdx < 0) distIdx = 0;
        }
      }
    }

    return { provIdx: pIdx, cityIdx, distIdx, cityOpts, distOpts };
  },

  loadOrder(orderId, role) {
    wx.showLoading({ title: "加载中..." });
    wx.cloud.callFunction({
      name: "quickstartFunctions",
      data: { type: "getOrderById", orderId, role: role || "a" },
    }).then((resp) => {
      wx.hideLoading();
      if (resp.result.success) {
        const o = resp.result.data;
        const r = o.role;
        const roleIdx = r === "b" ? 1 : r === "a" ? 2 : 0;

        let onlineIdx = 0;
        if (this.data.onlineCategories.includes(o.category)) onlineIdx = 1;
        else if (this.data.offlineCategories.includes(o.category)) onlineIdx = 2;
        const catOpts = this.buildCategoryOptions(onlineIdx);
        const catIdx = catOpts.indexOf(o.category);

        const loc = this.parseCityField(o.city || "");

        this.setData({
          roleIndex: roleIdx,
          onlineIndex: onlineIdx,
          categoryOptions: catOpts,
          categoryIndex: catIdx >= 0 ? catIdx : 0,
          provinceIndex: loc.provIdx,
          cityOptions: loc.cityOpts,
          cityIndex: loc.cityIdx,
          districtOptions: loc.distOpts,
          districtIndex: loc.distIdx,
          title: o.title || "",
          content: o.content || "",
          reward: String(o.reward || ""),
          contact: o.contact || "",
          images: o.images || [],
        });
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: "加载失败", icon: "none" });
    });
  },

  onBack() {
    wx.switchTab({ url: "/pages/profile/profile" });
  },

  onRoleChange(e) {
    this.setData({ roleIndex: Number(e.detail.value) });
  },

  onOnlineChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      onlineIndex: idx,
      categoryIndex: 0,
      categoryOptions: this.buildCategoryOptions(idx),
      provinceIndex: 0,
      cityOptions: ["市/区"],
      cityIndex: 0,
      districtOptions: ["区"],
      districtIndex: 0,
    });
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) });
  },

  onProvinceChange(e) {
    const idx = Number(e.detail.value);
    if (idx === 0) {
      this.setData({
        provinceIndex: 0,
        cityOptions: ["市/区"],
        cityIndex: 0,
        districtOptions: ["区"],
        districtIndex: 0,
      });
      return;
    }
    const province = this.data.provinceOptions[idx];

    if (isMunicipality(province)) {
      // 直辖市：下拉5 = 直辖市名（唯一选项），下拉6 = 区
      const districts = getCitiesForPost(province);
      this.setData({
        provinceIndex: idx,
        cityOptions: ["市/区", province],
        cityIndex: 1,
        districtOptions: ["区"].concat(districts),
        districtIndex: 0,
      });
    } else {
      // 普通省：下拉5 = 市，下拉6 = 区（待选）
      const cities = getCitiesForPost(province);
      this.setData({
        provinceIndex: idx,
        cityOptions: ["市/区"].concat(cities),
        cityIndex: 0,
        districtOptions: ["区"],
        districtIndex: 0,
      });
    }
  },

  onCityChange(e) {
    const idx = Number(e.detail.value);
    const province = this.data.provinceOptions[this.data.provinceIndex];

    if (isMunicipality(province)) {
      // 直辖市：下拉5是直辖市名，区已在下拉4变更时加载
      this.setData({ cityIndex: idx });
    } else {
      // 普通省：下拉5是市，下拉6是该市的区
      if (idx === 0) {
        this.setData({ cityIndex: 0, districtOptions: ["区"], districtIndex: 0 });
        return;
      }
      const city = this.data.cityOptions[idx];
      const districts = getDistrictsForPost(province, city);
      this.setData({
        cityIndex: idx,
        districtOptions: districts.length > 0 ? ["区"].concat(districts) : ["区"],
        districtIndex: 0,
      });
    }
  },

  onDistrictChange(e) {
    this.setData({ districtIndex: Number(e.detail.value) });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onRewardInput(e) {
    this.setData({ reward: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 9 - this.data.images.length,
      mediaType: ["image"],
      sizeType: ["compressed"],
      success: (res) => {
        const files = res.tempFiles;
        wx.showLoading({ title: "上传中..." });
        const uploads = files.map((file) =>
          wx.cloud.uploadFile({
            cloudPath: "orders/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + ".jpg",
            filePath: file.tempFilePath,
          })
        );
        Promise.all(uploads).then((results) => {
          wx.hideLoading();
          const newImages = results.map((r) => r.fileID);
          this.setData({ images: this.data.images.concat(newImages) });
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: "上传失败", icon: "none" });
        });
      },
    });
  },

  onDelImage(e) {
    const idx = e.currentTarget.dataset.index;
    const images = this.data.images.filter((_, i) => i !== idx);
    this.setData({ images });
  },

  cancelOrder() {
    const { editId } = this.data;
    if (!editId) return;
    wx.showModal({
      title: "确认撤销",
      content: "撤销后该信息将不再显示在信息池中，此操作不可恢复。",
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "撤销中..." });
        wx.cloud.callFunction({
          name: "quickstartFunctions",
          data: { type: "cancelOrder", orderId: editId, role: this.data.editRole || "a" },
        }).then((resp) => {
          wx.hideLoading();
          if (resp.result.success) {
            wx.showToast({ title: "已撤销" });
            this._fromCardEdit = false;
            this.resetForm();
          } else {
            wx.showToast({ title: resp.result.errMsg || "操作失败", icon: "none" });
          }
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: "操作失败", icon: "none" });
        });
      },
    });
  },

  onSave() {
    const draft = {
      roleIndex: this.data.roleIndex,
      onlineIndex: this.data.onlineIndex,
      categoryOptions: this.data.categoryOptions,
      categoryIndex: this.data.categoryIndex,
      provinceIndex: this.data.provinceIndex,
      cityOptions: this.data.cityOptions,
      cityIndex: this.data.cityIndex,
      districtOptions: this.data.districtOptions,
      districtIndex: this.data.districtIndex,
      title: this.data.title,
      content: this.data.content,
      reward: this.data.reward,
      contact: this.data.contact,
      images: this.data.images,
    };
    wx.setStorageSync("postDraft", draft);
    wx.showToast({ title: "已保存", icon: "success" });
  },

  onReset() {
    wx.removeStorageSync("postDraft");
    this.resetForm();
  },

  restoreDraft(draft) {
    this.setData({
      roleIndex: draft.roleIndex || 0,
      onlineIndex: draft.onlineIndex || 0,
      categoryOptions: draft.categoryOptions || this.data.allCategoryOptions,
      categoryIndex: draft.categoryIndex || 0,
      provinceIndex: draft.provinceIndex || 0,
      cityOptions: draft.cityOptions || ["市/区"],
      cityIndex: draft.cityIndex || 0,
      districtOptions: draft.districtOptions || ["区"],
      districtIndex: draft.districtIndex || 0,
      title: draft.title || "",
      content: draft.content || "",
      reward: draft.reward || "",
      contact: draft.contact || "",
      images: draft.images || [],
    });
  },

  submitOrder() {
    const {
      roleIndex,
      onlineIndex,
      categoryOptions, categoryIndex,
      provinceOptions, provinceIndex,
      cityOptions, cityIndex,
      districtOptions, districtIndex,
      title, content, reward, contact, images, editId, editRole,
    } = this.data;

    if (roleIndex === 0) {
      wx.showToast({ title: "请选择身份", icon: "none" });
      return;
    }
    if (onlineIndex === 0) {
      wx.showToast({ title: "请选择线上/线下", icon: "none" });
      return;
    }
    if (categoryIndex === 0) {
      wx.showToast({ title: "请选择品类", icon: "none" });
      return;
    }
    if (!title.trim()) {
      wx.showToast({ title: "请输入标题", icon: "none" });
      return;
    }
    if (!content.trim()) {
      wx.showToast({ title: "请输入内容", icon: "none" });
      return;
    }
    if (roleIndex === 2 && (!reward || Number(reward) <= 0)) {
      wx.showToast({ title: "请输入有效薪酬", icon: "none" });
      return;
    }
    if (!contact.trim()) {
      wx.showToast({ title: "请输入联系方式", icon: "none" });
      return;
    }

    // 城市校验
    if (provinceIndex === 0) {
      wx.showToast({ title: "请选择省份", icon: "none" });
      return;
    }
    const province = provinceOptions[provinceIndex];
    if (isMunicipality(province)) {
      if (districtIndex === 0) {
        wx.showToast({ title: "请选择区", icon: "none" });
        return;
      }
    } else {
      if (cityIndex === 0) {
        wx.showToast({ title: "请选择市", icon: "none" });
        return;
      }
      // 区校验：仅当有实际区数据时要求选择
      if (districtOptions.length > 1 && districtIndex === 0) {
        wx.showToast({ title: "请选择区", icon: "none" });
        return;
      }
    }

    // 组合城市字段（直辖市跳过与省份同名的市）
    let cityValue = province;
    if (cityIndex > 0 && cityOptions[cityIndex] !== province) {
      cityValue += "·" + cityOptions[cityIndex];
    }
    if (districtIndex > 0) {
      cityValue += "·" + districtOptions[districtIndex];
    }

    const userInfo = wx.getStorageSync("userInfo") || {};

    const role = roleIndex === 1 ? "b" : "a";

    const cloudData = {
      role,
      category: categoryOptions[categoryIndex],
      title: title.trim(),
      content: content.trim(),
      reward: role === "a" ? Number(reward) : 0,
      contact: contact.trim(),
      city: cityValue,
      images,
      publisherName: userInfo.nickName || "",
      publisherAvatar: userInfo.avatarUrl || "",
    };

    if (editId) {
      cloudData.type = "updateOrder";
      cloudData.orderId = editId;
      cloudData.role = editRole || role;
    } else {
      cloudData.type = "createOrder";
    }

    wx.showLoading({ title: editId ? "更新中..." : "发布中..." });
    wx.cloud.callFunction({
      name: "quickstartFunctions",
      data: cloudData,
    }).then((resp) => {
      wx.hideLoading();
      if (resp.result.success) {
        wx.showToast({ title: editId ? "已更新" : "发布成功" });
        this._fromCardEdit = false;
        if (!editId) {
          wx.removeStorageSync("postDraft");
          this.setData({
            roleIndex: 0,
            onlineIndex: 0,
            categoryOptions: this.data.allCategoryOptions,
            categoryIndex: 0,
            provinceIndex: 0,
            cityOptions: ["市/区"],
            cityIndex: 0,
            districtOptions: ["区"],
            districtIndex: 0,
            title: "",
            content: "",
            reward: "",
            contact: "",
            images: [],
          });
        }
      } else {
        wx.showToast({ title: resp.result.errMsg || "操作失败", icon: "none" });
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: "操作失败", icon: "none" });
    });
  },
});
