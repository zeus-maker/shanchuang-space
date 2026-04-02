# AI Canvas

一个基于 Vue Flow 的可视化 AI 创作画布，支持文生图、视频生成等 AI 工作流的节点式编排。
[体验地址](https://marketing.chatfire.site/huobao-canvas/)

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.2-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📸 截图

### 首页
![首页](./doc/home.png)

### 画布
![画布](./doc/canvas.png)

### API 配置
![API 配置](./doc/api-config.png)

## ✨ 特性

- 🎨 **可视化节点编排** - 基于 Vue Flow 的无限画布，支持拖拽、缩放、连接
- 🖼️ **文生图工作流** - 支持配置提示词、模型、尺寸等参数生成图片
- 🎬 **视频生成工作流** - 支持图生视频，可设置首帧/尾帧图片
- 🤖 **AI 提示词润色** - 一键 AI 优化提示词，提升生成质量
- 🌓 **深色/浅色主题** - 支持主题切换，保护眼睛
- 💾 **本地项目存储** - 项目数据本地持久化，支持多项目管理
- ↩️ **撤销/重做** - 完整的操作历史记录

## 📦 节点类型

| 节点 | 描述 |
|------|------|
| **文本节点** | 输入/编辑提示词文本 |
| **文生图配置** | 配置图片生成参数（模型、尺寸、数量等） |
| **图片节点** | 展示生成的图片或上传本地图片 |
| **视频生成配置** | 配置视频生成参数（支持首帧/尾帧图片） |
| **视频节点** | 展示生成的视频 |

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm / npm / yarn

### 安装

```bash
# 克隆项目
git clone https://github.com/chatfire-AI/huobao-canvas.git
cd huobao-canvas

# 安装依赖
pnpm install
# 或
npm install

# 启动开发服务器（含本地媒体缓存时推荐同时起 media server）
pnpm dev:all
# 或仅前端
pnpm dev
# 或
npm run dev:all
npm run dev
```

### 构建

```bash
pnpm build
# 或
npm run build
```

## ⚙️ 配置

首次使用需要配置 API：

1. 点击右上角设置图标 ⚙️
2. 填入 API Base URL 和 API Key
3. 选择需要使用的模型

支持 OpenAI 兼容的 API 接口。

**豆包 Seedream / Seedance 1.5 Pro（火山 Ark）：** 可将密钥写在项目根目录 `.env` 的 `VITE_VOLCENGINE_API_KEY`（参考 `.env.example`）。`VITE_VOLCENGINE_BASE_URL` 可只写到地域域名，缺少 `/api/v3` 时会自动补全，避免生图请求 404。修改后需重启开发服务；`.env` 勿提交仓库。

### 本地媒体缓存（图片 / 视频落盘）

火山等返回的素材链接常为短期签名 URL，刷新项目后会过期。仓库自带轻量 Node 服务 `server/index.mjs`，在生成成功后将远程文件下载到本地目录，**预览优先走本地**；本地文件缺失或播放失败时，会尝试用已保存的远程地址再次拉取，视频在仍无效时用 **`videoTaskId` 调查询接口** 换新链再缓存。

- **开发**：终端一运行 `npm run server`（默认端口 `8787`，目录默认 `./uploads`），终端二 `npm run dev`；或一条命令 `npm run dev:all`。
- **环境变量**：`MEDIA_ROOT` 指定存储根路径（默认项目根下 `uploads/`）；`MEDIA_SERVER_PORT` / `PORT` 控制监听端口。
- **前端**：默认使用相对路径 `/api/media`（Vite 已代理到本机 8787）。若媒体服务在其它机器，设置 `VITE_MEDIA_API_URL` 为完整 origin。
- **生产**：`npm run build` 后执行 `SERVE_STATIC=1 PORT=80 node server/index.mjs`（或 Docker 镜像内已配置 `SERVE_STATIC`），由同一进程提供 `/huobao-canvas` 静态资源与 `/api/media`。若仍用 **仅 Nginx** 托管静态文件，需把 `location /api/media/` 反代到本机 Node 服务（参见 `nginx.conf` 示例）。

## 🛠️ 技术栈

- **框架**: [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/)
- **画布**: [Vue Flow](https://vueflow.dev/)
- **UI 组件**: [Naive UI](https://www.naiveui.com/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **图标**: [@vicons/ionicons5](https://www.xicons.org/)
- **路由**: [Vue Router](https://router.vuejs.org/)

## 📁 项目结构

```
src/
├── api/          # API 请求封装
├── assets/       # 静态资源
├── components/   # 组件
│   ├── nodes/    # 节点组件
│   └── edges/    # 边组件
├── hooks/        # 组合式函数
├── router/       # 路由配置
├── stores/       # 状态管理
├── utils/        # 工具函数
└── views/        # 页面视图
```

## 🔄 自动执行工作流

开启「自动执行」模式后，系统会通过 AI 分析用户意图，自动编排并执行工作流。

### 工作流类型

| 类型 | 触发条件 | 说明 |
|------|---------|------|
| `text_to_image` | 默认 | 文生图工作流 |
| `text_to_image_to_video` | 包含"视频"、"动画"等关键词 | 文生图生视频工作流 |
| `storyboard` | 包含"分镜"、"场景"、"镜头"等关键词 | 分镜工作流 |

### 工作流 1: 文生图 / 文生图生视频

![工作流架构](./doc/workflow.png)

### 工作流 2: 分镜工作流 (Storyboard)

![分镜工作流](./doc/workflow2.png)

**示例输入:** `蜡笔小新去上学。分镜一：清晨的战争；分镜二：出发的风姿`

**AI 解析:**
- 提取角色: 蜡笔小新 (外观描述)
- 拆分分镜: 清晨的战争、出发的风姿

**执行流程:**
1. 生成角色参考图
2. 依次生成各分镜图片 (连接角色参考图保持一致性)

### 执行流程

1. **AI 意图分析** - 分析用户输入，判断工作流类型，生成优化后的提示词
2. **创建节点** - 按顺序创建文本节点和配置节点
3. **串行执行** - 配置节点自动执行，等待上一步完成后再执行下一步
4. **输出结果** - 生成图片/视频节点展示结果

### 核心组件

- `useWorkflowOrchestrator` - 工作流编排器 Hook
- `waitForConfigComplete` - 等待配置节点完成
- `waitForOutputReady` - 等待输出节点就绪

## 📝 开发与问题记录

修复 Bug 或排查问题后，请在 [`docs/dev/`](./docs/dev/) 按模板补充记录（原因、修改点、复盘），并 **`git commit`** 写明原因与修改要点。说明见 [`docs/dev/README.md`](./docs/dev/README.md)。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 联系我

扫码添加微信交流：

<img src="./doc/wx-group.jpg" width="200" alt="微信二维码" />

## 📄 License

[MIT](./LICENSE)
