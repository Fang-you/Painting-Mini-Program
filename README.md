# AI画画 - 微信小程序

一个基于微信云开发的AI绘画小程序，用户可以用文字描述生成AI图片，并分享到作品广场。

## 功能特性

- 🎨 **AI图片生成**：输入文字描述，一键生成精美图片
- 🖼️ **作品广场**：浏览所有用户发布的AI画作（瀑布流展示）
- 👤 **个人画廊**：管理自己创作的所有画作
- ❤️ **作品详情**：查看画作详情和完整尺寸图片
- 📱 **响应式设计**：适配各种屏幕尺寸

## 技术栈

- **框架**: 微信小程序 + TypeScript
- **UI组件**: TDesign Miniprogram
- **后端**: 微信云开发（CloudBase）
- **AI服务**: WanX AI图片生成

## 项目结构

```
├── cloudfunctions/          # 云函数
│   ├── artworks/            # 画作管理（CRUD）
│   ├── login/               # 用户登录
│   ├── updateUserProfile/   # 更新用户信息
│   └── wanx/                # AI生成服务调用
├── miniprogram/             # 小程序前端
│   ├── pages/               # 页面
│   │   ├── index/           # 首页（作品广场）
│   │   ├── create/          # 创建页面（AI生成）
│   │   ├── profile/         # 个人中心
│   │   └── logs/            # 日志页面
│   ├── custom-tab-bar/      # 自定义Tab栏
│   ├── utils/               # 工具函数
│   ├── app.ts               # 小程序入口
│   └── app.json             # 小程序配置
├── docs/                    # 文档
│   └── prd.md               # 产品需求文档
├── typings/                 # TypeScript类型定义
├── package.json             # 项目依赖
├── project.config.json      # 微信开发者工具配置
└── tsconfig.json            # TypeScript配置





```

## 快速开始

### 前置条件

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号并获取 AppID

### 开发步骤

1. **克隆项目**

```bash
git clone https://github.com/your-username/pating-miniprogram.git
cd pating-miniprogram
```

2. **安装依赖**

```bash
npm install
```

3. **配置项目**

修改 `project.config.json` 中的 `appid` 字段为你的小程序 AppID：

```json
{
  "appid": "your-app-id"
}
```

4. **配置云开发**

在微信开发者工具中：
- 打开云开发控制台
- 创建云环境
- 修改 `miniprogram/app.ts` 中的环境ID：

```typescript
wx.cloud.init({
  env: 'your-cloud-env-id',
  traceUser: true,
})
```

5. **部署云函数**

在微信开发者工具中右键云函数目录，选择"上传并部署"。

6. **运行项目**

打开微信开发者工具，导入项目，点击"预览"或"真机调试"。

## 页面说明

### 首页（作品广场）
- 瀑布流展示所有用户发布的画作
- 支持下拉刷新和上拉加载更多
- 点击卡片查看作品详情
- 悬浮"+"按钮跳转到创建页面

### 创建页面
- 输入提示词描述想要生成的画面
- 选择绘画风格（机械风、未来风、动漫风等）
- 点击生成按钮调用AI生成图片
- 生成完成后可预览并发布到广场

### 个人中心
- 显示用户头像和昵称
- 微信一键登录
- 展示用户个人画廊（三列网格）
- 支持删除自己的画作

## API 说明

### 云函数接口

| 云函数 | 方法 | 说明 |
|--------|------|------|
| `artworks` | `list` | 获取作品列表 |
| `artworks` | `listUser` | 获取用户作品列表 |
| `artworks` | `create` | 创建作品 |
| `artworks` | `delete` | 删除作品 |
| `wanx` | `create` | 创建AI生成任务 |
| `wanx` | `get` | 查询任务状态 |

## 开发规范

- 使用 TypeScript 编写
- 遵循 TDesign 设计规范
- 使用微信云开发数据库
- 代码格式使用 ESLint 检查

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**：本项目使用 WanX AI 服务，部署前请确保已配置相关 API 权限。
