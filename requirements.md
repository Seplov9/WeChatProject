# 需求记录

> 此文档自动维护。每次用户提出明确需求时，先检索本文档判断是新需求还是更新旧需求，然后自动更新对应章节。

---

## 信息池页面（pages/index/index）

**最后更新:** 2026-05-12

### 默认行为
1. 所有下拉框处于默认初始值时，展示全部数据（双表合并）
2. 数据排序：boost 降序优先，再按 createdAt 降序（最新发布在前）
3. 页面显示时（onShow）自动拉取最新数据

### 下拉框
| # | 名称 | 选项数组 | 默认值 | 行为 |
|---|------|---------|--------|------|
| 1 | 身份 | `roleOptions` | "身份" | 触发 `fetchOrders(true)` 重拉云函数 |
| 2 | 线上/线下 | `onlineOptions` | "线上/线下" | 本地过滤；同时联动更新分类和重置城市 |
| 3 | 分类 | `categoryOptions` | "分类" | 本地过滤；选项由线上/线下联动 |
| 4 | 省份 | `provinceOptions` | "全部" | 本地过滤；联动更新市和区选项 |
| 5 | 市 | `cityOptions` | "全部" | 本地过滤；联动更新区选项 |
| 6 | 区 | `districtOptions` | "全部" | 本地过滤 |

- 省份、市下拉框第一个选项为"全部"，供用户查看全部数据
- 切换线上/线下时，分类、城市下拉框重置为默认值

### 交互
- **下拉刷新**：触顶下滑触发 `onPullDownRefresh`，重新加载数据后停止动画
- **触底加载更多**：`onReachBottom` 触发分页加载（PAGE_SIZE=10）
- **搜索**：关键词搜索标题和内容（双字段任一命中即展示），本地过滤
- **收藏**：点击星号切换收藏/取消，写入 `favorites` 集合
- **卡片点击**：跳转详情页，同时记录浏览历史（`recordHistory`）

### 数据显示
- 薪酬仅当 > 0 时显示
- 收藏状态根据 `favoritedIds` 展示实心/空心星
- 无数据时显示"暂无信息"
- 加载中/已加载全部的底部状态提示

---

## 发布页面（pages/post/post）

**最后更新:** 2026-05-12

### 下拉框校验（提交时全部拦截）

| # | 名称 | 选项数组 | 默认占位 | 校验规则 |
|---|------|---------|---------|---------|
| 1 | 身份 | `roleOptions` | "身份" | 必选，否则提示"请选择身份" |
| 2 | 线上/线下 | `onlineOptions` | "线上/线下" | 必选，否则提示"请选择线上/线下" |
| 3 | 分类 | `categoryOptions` | "分类" | 必选，否则提示"请选择品类" |
| 4 | 省份 | `provinceOptions` | "省份" | 必选，否则提示"请选择省份" |
| 5 | 市/区 | `cityOptions` | "市/区" | 必选；直辖市提示"请选择区"，普通省提示"请选择市" |
| 6 | 区 | `districtOptions` | "区" | 普通省且有实际区数据时必选，否则提示"请选择区" |

- 发布页所有下拉框均**没有"全部"选项**，用占位文字代替

### 城市级联
- **直辖市**（北京/天津/上海/重庆）：
  - 下拉4 选直辖市 → 下拉5 显示该直辖市的区，下拉6 锁定为"全部"
  - city 字段格式：`"北京·朝阳区"`
- **普通省份**：
  - 下拉4 选省份 → 下拉5 显示该省的市，下拉6 显示该市的区
  - city 字段格式：`"广东·广州·天河区"` 或 `"广东·广州"`（区数据不足时）

### 其他校验
- 标题：必填，≤50字
- 内容：必填，≤500字
- 薪酬：身份为"我需要"时必填且 > 0
- 联系方式：必填

### 编辑模式
- 从"我的发布"点击卡片进入，加载已有数据回填
- 支持保存修改和撤销发布（status 改为 closed）
- 从详情页进入发布者主页后可编辑

### 导航栏
- 使用自定义导航栏（`navigationStyle: "custom"`）
- 从 tabbar 进入（新建模式）：仅显示居中标题"发布"，无返回按钮
- 从"我的发布"进入（编辑模式）：左上角显示 `<` 返回图标，点击跳回 profile 页

### 图片
- 可选，最多 9 张
- 上传至云存储 `orders/` 目录

---

## 信息详情页（pages/show/show）

**最后更新:** 2026-05-12

- 图片轮播（swiper，点击可预览大图）
- 显示：分类、薪酬（>0时）、标题、内容、联系方式、城市、发布时间
- 发布者信息行：头像 + 昵称，点击进入发布者主页
- 右上角收藏星标（☆/★），点击切换收藏状态，与信息池卡片一致
- 薪酬仅当 > 0 时显示

---

## 发布者主页（pages/publisher/publisher）

**最后更新:** 2026-05-12

- 显示发布者头像、昵称、发单总数
- 列出所有有效发单（status: "active"）
- 点击卡片跳转详情页

---

## 我的页面（pages/profile/profile）

**最后更新:** 2026-05-12

### 登录
- 使用 `open-type="chooseAvatar"` 获取头像（不用 `getUserInfo`）
- 使用 `type="nickname"` 输入框获取昵称（不用 `getUserProfile`）
- 需勾选同意协议才能登录
- 登录后信息存入 `wx.Storage`（key: "userInfo"）

### 修改资料
- 点击头像区域弹出修改弹窗
- 可更换头像和昵称
- 保存时同步更新 `orders_a` 和 `orders_b` 中的 `publisherName` 和 `publisherAvatar`

### 导航
- 我的发布 → order-list（type=myOrders）
- 我的收藏 → order-list（type=favorites）
- 浏览记录 → order-list（type=history）
- 退出登录：清除 Storage

---

## 列表页（pages/order-list/order-list）

**最后更新:** 2026-05-12

### 三种类型
- `myOrders`：我的发布，数据扁平（直接字段）
- `favorites`：我的收藏，数据在 `orderSnapshot` 中
- `history`：浏览记录，数据在 `orderSnapshot` 中

### 下拉框筛选
- 仅"我的发布"支持身份筛选（role 字段直接存在）
- 支持搜索（标题+内容双字段匹配）、线上/线下、分类、省/市/区筛选
- 城市下拉框有"全部"选项（用于筛选）
- 筛选为本地过滤

### 交互
- 我的发布：点击卡片 → 切换 tab 到发布页进入编辑模式
- 收藏/历史：点击卡片 → 跳转详情页
- 我的发布卡片显示状态标签（进行中/已结束）

---

## 云函数（quickstartFunctions）

**最后更新:** 2026-05-12

### API 列表
| type | 功能 | 涉及集合 |
|------|------|---------|
| `createOrder` | 发布信息 | `orders_a` 或 `orders_b` |
| `getOrders` | 信息池分页查询 | `orders_a` + `orders_b` |
| `getOrderById` | 单条详情 | `orders_a` 或 `orders_b` |
| `updateOrder` | 编辑信息 | `orders_a` 或 `orders_b` |
| `cancelOrder` | 撤销（status→closed） | `orders_a` 或 `orders_b` |
| `getMyOrders` | 我的发布 | `orders_a` + `orders_b` |
| `getPublisherOrders` | 发布者发单 | `orders_a` + `orders_b` |
| `toggleFavorite` | 收藏/取消 | `favorites` |
| `getFavorites` | 收藏列表（含存在校验） | `favorites` + `orders_a` + `orders_b` |
| `recordHistory` | 记录浏览 | `history` |
| `getHistory` | 浏览历史（含存在校验） | `history` + `orders_a` + `orders_b` |
| `saveUser` | 保存用户+同步昵称头像 | `users` + `orders_a` + `orders_b` |

### 关键逻辑
- 双表模式：`orders_a`（甲方/我需要）和 `orders_b`（乙方/我可以）
- `getOrders`：双表全量拉取后在内存中合并、排序（boost desc → createdAt desc）、分页
- `saveUser`：同步更新两表中该用户所有订单的昵称和头像
- `getFavorites` / `getHistory`：返回数据前用 `db.command.in` 批量校验 `orderId` 是否仍存在于 `orders_a` 或 `orders_b`，过滤已撤销/不存在的订单
- 内容安全：发布和保存用户信息时调用 `msgSecCheck`
- 权限校验：编辑/撤销时校验 `publisherId === openid`

### 安全
- openid 在云函数服务端通过 `cloud.getWXContext()` 获取，不依赖客户端传入

---

## 数据库

**最后更新:** 2026-05-12

| 集合 | 说明 |
|------|------|
| `orders_a` | 甲方（我需要），role="a" |
| `orders_b` | 乙方（我可以），role="b" |
| `users` | 用户信息 |
| `favorites` | 收藏（userId + orderId + orderSnapshot） |
| `history` | 浏览记录（userId + orderId + orderSnapshot） |

### 需创建的复合索引
- `orders_a`: `status` + `boost` desc + `createdAt` desc
- `orders_a`: `publisherId` + `createdAt` desc
- `orders_b`: `status` + `boost` desc + `createdAt` desc
- `orders_b`: `publisherId` + `createdAt` desc
- `favorites`: `userId` + `createdAt` desc
- `history`: `userId` + `viewedAt` desc

---

## 全局

**最后更新:** 2026-05-12

- 自定义 tabBar（信息池 / 发布 / 我的）
- 云环境：`cloud1-d0g9kmpvrb91e28de`
- `getPhoneNumber` 暂不可用（个人主体无权限）
- `getUserProfile` 已废弃不可用
- 按钮文字居中用 flex 布局
- 弹窗需避开自定义 tabbar（padding-bottom + z-index）
- 本地调试操作真实云端数据库
- 上传云函数用云端安装依赖

---

## 用户协作偏好

**最后更新:** 2026-05-12

1. 实现新功能前，必须先查阅本文档确认不会破坏已有需求
2. 用户提出新需求时，自动检索本文档判断是新增还是更新，然后更新对应章节
3. 不随意修改已有样式，聚焦用户真正提出的问题
4. 生成带时间的文件名时必须用 `date` 命令获取真实北京时间
5. 当用户说"更新文档"时，按 `project readme/README.md` 规范撰写新文档
6. 用户纠正过的方案不要再走弯路（如：chooseAvatar 替代 getUserInfo）
