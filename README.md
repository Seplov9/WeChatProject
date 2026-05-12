# 信息发布平台

微信小程序信息发布平台，支持供需双方发布信息、浏览筛选、收藏、历史记录等功能。

## 技术栈

- 微信小程序原生框架
- 微信云开发（云函数 + 云数据库 + 云存储）

## 功能

### 信息池
- 默认同时展示甲方（我需要）和乙方（我可以）的所有发布信息
- 支持按身份、线上/线下、分类、省/市/区筛选
- 支持关键词搜索
- 支持收藏/取消收藏
- 上拉触底加载更多

### 发布信息
- 选择身份（我可以 / 我需要）
- 选择线上/线下、分类
- 选择省/市/区
- 上传图片（最多9张）
- 选择"我需要"时可填写报酬
- 支持编辑已发布信息
- 支持撤销已发布信息

### 我的
- 个人信息（头像、昵称）登录与修改
- 我的发布：查看/编辑已发布信息
- 我的收藏：查看已收藏信息
- 浏览记录：查看历史浏览信息

### 信息详情
- 图片轮播
- 查看发布者信息
- 点击发布者头像进入发布者主页，查看其所有发单

## 数据库

| 集合 | 说明 |
|------|------|
| `orders_a` | 甲方表（我需要），`role: "a"` |
| `orders_b` | 乙方表（我可以），`role: "b"` |
| `users` | 用户信息（头像、昵称） |
| `favorites` | 收藏记录 |
| `history` | 浏览记录 |

### 复合索引

| 集合 | 索引字段 | 说明 |
|------|---------|------|
| `orders_a` | `status` + `boost` desc + `createdAt` desc | 信息池查询排序 |
| `orders_a` | `publisherId` + `createdAt` desc | 我的发布/发布者主页 |
| `orders_b` | `status` + `boost` desc + `createdAt` desc | 信息池查询排序 |
| `orders_b` | `publisherId` + `createdAt` desc | 我的发布/发布者主页 |
| `favorites` | `userId` + `createdAt` desc | 收藏列表 |
| `history` | `userId` + `viewedAt` desc | 历史记录 |

### 权限

所有集合设置为仅创建者可读写。

## 云函数

`quickstartFunctions` — 所有后端逻辑：

| 类型 | 说明 |
|------|------|
| `createOrder` | 创建信息（写入 orders_a 或 orders_b） |
| `getOrders` | 信息池查询（支持角色筛选，双表合并排序分页） |
| `getOrderById` | 单条信息详情 |
| `updateOrder` | 编辑信息 |
| `cancelOrder` | 撤销信息（status 改为 closed） |
| `getMyOrders` | 我的发布（双表合并） |
| `getPublisherOrders` | 发布者所有发单（双表合并） |
| `toggleFavorite` | 收藏/取消收藏 |
| `getFavorites` | 收藏列表 |
| `recordHistory` | 记录浏览历史 |
| `getHistory` | 浏览历史列表 |
| `saveUser` | 保存/更新用户信息，同步更新所有历史订单中的昵称和头像 |

## 项目结构

```
├── app.json                    # 小程序配置（页面路由、tabBar、窗口样式）
├── custom-tab-bar/             # 自定义底部导航
├── cloudfunctions/
│   └── quickstartFunctions/    # 云函数
│       └── index.js
├── miniprogram/
│   ├── app.js
│   ├── data/
│   │   └── regions.js          # 省市区数据
│   └── pages/
│       ├── index/              # 信息池
│       ├── post/               # 发布/编辑信息
│       ├── show/               # 信息详情
│       ├── publisher/          # 发布者主页
│       ├── profile/            # 我的（个人信息）
│       └── order-list/         # 我的发布 / 收藏 / 历史
```

## 本地开发

1. 克隆项目，使用微信开发者工具打开
2. 开通云开发，创建环境
3. 在云开发控制台创建上述数据库集合及复合索引
4. 右键云函数目录，选择"上传并部署"
5. 编译运行
