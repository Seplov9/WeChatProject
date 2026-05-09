const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

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
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    return { success: true, openid };
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
  }
};
