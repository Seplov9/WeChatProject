const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 内容安全审核，返回 true 表示违规
const checkContent = async (content, scene, openid) => {
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content,
      version: 2,
      scene,
      openid,
    });
    return res.result.suggest !== "pass";
  } catch (e) {
    // API 不可用时放行（如个人主体无权限）
    return false;
  }
};

// 获取openid
const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 获取手机号（个体工商户后可用）
const getPhoneNumber = async (event) => {
  try {
    const res = await cloud.openapi.phonenumber.getPhoneNumber({
      code: event.code,
    });
    return { success: true, phoneNumber: res.phoneInfo.phoneNumber };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 写入提交数据
const addUserData = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (await checkContent(event.content, 2, openid)) {
    return { success: false, errMsg: "内容不合规，请修改" };
  }

  try {
    await db.createCollection("users");
  } catch (e) {
    // 集合已存在则忽略
  }
  try {
    await db.collection("users").add({
      data: {
        type: "submission",
        userId: wxContext.OPENID,
        inputTime: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
        inputContent: event.content,
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 查询提交数据
const getUserData = async () => {
  try {
    const result = await db
      .collection("users")
      .where({ type: "submission" })
      .orderBy("inputTime", "desc")
      .get();
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 保存/更新用户信息
const saveUser = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (await checkContent(event.nickName, 1, openid)) {
    return { success: false, errMsg: "内容不合规，请修改" };
  }

  try {
    await db.createCollection("users");
  } catch (e) {
    // 集合已存在则忽略
  }

  try {
    const exist = await db.collection("users").where({ openid }).get();
    if (exist.data.length > 0) {
      await db.collection("users").doc(exist.data[0]._id).update({
        data: {
          nickName: event.nickName,
          avatarUrl: event.avatarUrl,
          updatedAt: new Date(),
        },
      });
    } else {
      await db.collection("users").add({
        data: {
          openid,
          nickName: event.nickName,
          avatarUrl: event.avatarUrl,
          phoneNumber: "",
          memberType: null,
          memberExpire: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // 同步更新该用户双表中所有订单的昵称和头像
    await Promise.all([
      db.collection("orders_a").where({ publisherId: openid }).update({
        data: { publisherName: event.nickName, publisherAvatar: event.avatarUrl },
      }),
      db.collection("orders_b").where({ publisherId: openid }).update({
        data: { publisherName: event.nickName, publisherAvatar: event.avatarUrl },
      }),
    ]);

    return { success: true, openid };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 发布信息
const createOrder = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // role: "a"=我需要(甲方), "b"=我可以(乙方)
  const role = event.role;
  if (role !== "a" && role !== "b") {
    return { success: false, errMsg: "请选择身份" };
  }

  if (await checkContent(event.title + " " + event.content, 2, openid)) {
    return { success: false, errMsg: "内容包含不合规信息，请修改后重新发布" };
  }

  const collection = role === "b" ? "orders_b" : "orders_a";

  try {
    await db.createCollection(collection);
  } catch (e) {
    // 集合已存在则忽略
  }

  try {
    await db.collection(collection).add({
      data: {
        role,
        publisherId: openid,
        publisherName: event.publisherName || "",
        publisherAvatar: event.publisherAvatar || "",
        category: event.category,
        title: event.title,
        content: event.content,
        reward: Number(event.reward) || 0,
        contact: event.contact || "",
        city: event.city || "",
        images: event.images || [],
        status: "active",
        boost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 撤销发布
const cancelOrder = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const collection = event.role === "b" ? "orders_b" : "orders_a";
  try {
    const order = await db.collection(collection).doc(event.orderId).get();
    if (order.data.publisherId !== openid) {
      return { success: false, errMsg: "无权操作" };
    }
    await db.collection(collection).doc(event.orderId).update({
      data: { status: "closed", updatedAt: new Date() },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 查询单个信息
const getOrderById = async (event) => {
  const collection = event.role === "b" ? "orders_b" : "orders_a";
  try {
    const result = await db.collection(collection).doc(event.orderId).get();
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 更新信息
const updateOrder = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (await checkContent(event.title + " " + event.content, 2, openid)) {
    return { success: false, errMsg: "内容包含不合规信息，请修改后重新发布" };
  }

  const collection = event.role === "b" ? "orders_b" : "orders_a";

  try {
    const order = await db.collection(collection).doc(event.orderId).get();
    if (order.data.publisherId !== openid) {
      return { success: false, errMsg: "无权修改" };
    }
    await db.collection(collection).doc(event.orderId).update({
      data: {
        category: event.category,
        title: event.title,
        content: event.content,
        reward: Number(event.reward) || 0,
        contact: event.contact || "",
        city: event.city || "",
        images: event.images || [],
        updatedAt: new Date(),
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 查询信息池（分页）
const getOrders = async (event) => {
  const skip = event.skip || 0;
  const pageSize = event.pageSize || 10;
  const roleFilter = event.roleFilter; // "a" / "b" / ""

  const collections = roleFilter === "b" ? ["orders_b"] : roleFilter === "a" ? ["orders_a"] : ["orders_a", "orders_b"];

  try {
    const results = await Promise.all(
      collections.map((col) =>
        db
          .collection(col)
          .where({ status: "active" })
          .get()
      )
    );
    let data = results.flatMap((r) => r.data);
    data.sort((a, b) => {
      const boostDiff = (b.boost || 0) - (a.boost || 0);
      if (boostDiff !== 0) return boostDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    const total = data.length;
    data = data.slice(skip, skip + pageSize + 1);
    const hasMore = data.length > pageSize;
    if (hasMore) data.pop();
    return { success: true, data, hasMore };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 查询我的发布（双表）
const getMyOrders = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    const [resA, resB] = await Promise.all([
      db.collection("orders_a").where({ publisherId: openid }).orderBy("createdAt", "desc").get(),
      db.collection("orders_b").where({ publisherId: openid }).orderBy("createdAt", "desc").get(),
    ]);
    const data = [...resA.data, ...resB.data].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return { success: true, data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 查询指定发布者的有效订单（双表）
const getPublisherOrders = async (event) => {
  try {
    const [resA, resB] = await Promise.all([
      db.collection("orders_a").where({ publisherId: event.publisherId, status: "active" }).orderBy("createdAt", "desc").get(),
      db.collection("orders_b").where({ publisherId: event.publisherId, status: "active" }).orderBy("createdAt", "desc").get(),
    ]);
    const data = [...resA.data, ...resB.data].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return { success: true, data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 切换收藏
const toggleFavorite = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    await db.createCollection("favorites");
  } catch (e) {}
  try {
    const exist = await db
      .collection("favorites")
      .where({ userId: openid, orderId: event.orderId })
      .get();
    if (exist.data.length > 0) {
      await db.collection("favorites").doc(exist.data[0]._id).remove();
      return { success: true, favorited: false };
    }
    await db.collection("favorites").add({
      data: {
        userId: openid,
        orderId: event.orderId,
        orderSnapshot: event.orderSnapshot,
        createdAt: new Date(),
      },
    });
    return { success: true, favorited: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 获取收藏列表（仅返回订单仍存在于 orders_a/orders_b 中的记录）
const getFavorites = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    const result = await db
      .collection("favorites")
      .where({ userId: openid })
      .orderBy("createdAt", "desc")
      .get();
    if (result.data.length === 0) return { success: true, data: [] };
    const orderIds = [...new Set(result.data.map((f) => f.orderId))];
    const [aRes, bRes] = await Promise.all([
      db.collection("orders_a").where({ _id: db.command.in(orderIds) }).get(),
      db.collection("orders_b").where({ _id: db.command.in(orderIds) }).get(),
    ]);
    const existing = new Set([...aRes.data.map((o) => o._id), ...bRes.data.map((o) => o._id)]);
    const filtered = result.data.filter((f) => existing.has(f.orderId));
    return { success: true, data: filtered };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 记录浏览历史
const recordHistory = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    await db.createCollection("history");
  } catch (e) {}
  try {
    // 删除同 orderId 的旧记录
    const exist = await db
      .collection("history")
      .where({ userId: openid, orderId: event.orderId })
      .get();
    if (exist.data.length > 0) {
      await db.collection("history").doc(exist.data[0]._id).remove();
    }
    await db.collection("history").add({
      data: {
        userId: openid,
        orderId: event.orderId,
        orderSnapshot: event.orderSnapshot,
        viewedAt: new Date(),
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 获取浏览历史（仅返回订单仍存在于 orders_a/orders_b 中的记录）
const getHistory = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    const result = await db
      .collection("history")
      .where({ userId: openid })
      .orderBy("viewedAt", "desc")
      .limit(50)
      .get();
    if (result.data.length === 0) return { success: true, data: [] };
    const orderIds = [...new Set(result.data.map((h) => h.orderId))];
    const [aRes, bRes] = await Promise.all([
      db.collection("orders_a").where({ _id: db.command.in(orderIds) }).get(),
      db.collection("orders_b").where({ _id: db.command.in(orderIds) }).get(),
    ]);
    const existing = new Set([...aRes.data.map((o) => o._id), ...bRes.data.map((o) => o._id)]);
    const filtered = result.data.filter((h) => existing.has(h.orderId));
    return { success: true, data: filtered };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "getPhoneNumber":
      return await getPhoneNumber(event);
    case "addUserData":
      return await addUserData(event);
    case "getUserData":
      return await getUserData();
    case "saveUser":
      return await saveUser(event);
    case "createOrder":
      return await createOrder(event);
    case "getOrders":
      return await getOrders(event);
    case "getMyOrders":
      return await getMyOrders();
    case "toggleFavorite":
      return await toggleFavorite(event);
    case "getFavorites":
      return await getFavorites();
    case "recordHistory":
      return await recordHistory(event);
    case "getHistory":
      return await getHistory();
    case "getOrderById":
      return await getOrderById(event);
    case "updateOrder":
      return await updateOrder(event);
    case "getPublisherOrders":
      return await getPublisherOrders(event);
    case "cancelOrder":
      return await cancelOrder(event);
  }
};
