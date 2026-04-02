# 品牌与路径：火宝画布 → 闪创空间

**日期**: 2026-04-02

## 背景与原因

产品统一更名为 **闪创空间**，去除「火宝画布」相关对外文案；部署路径与仓库标识改为 **`shanchuang-space`**，避免与旧品牌混淆。

## 修改点

- **对外名称**：页面标题、首页欢迎语、README 与主要设计文档标题统一为「闪创空间」；npm 包名 **`shanchuang-space`**。  
- **Web `base` 与路由**：`/huobao-canvas` → **`/shanchuang-space`**（`vite.config.js`、`vue-router`、`server` 静态目录、`nginx.conf` 示例）。  
- **存储与事件键**：`ai-canvas-projects`、`ai-canvas-initial-prompt`、`huobao-canvas-toolbox`、`huobao-canvas-group-node-execute` 等改为 **`shanchuang-space-*`**（旧数据不自动迁移）。  
- **渠道展示**：设置中的 **Chatfire** 渠道展示名由「火宝 (Chatfire)」改为 **「Chatfire」**；代码内 `chatfire` provider 键保持不变。  
- **文档**：`README.md` 全面重写；`README.docker.md`、`docs/TECH.md`、`PRD`、无限画布设计文档及 dev 留档中路径与品牌同步；媒体服务 User-Agent 更新。

## 复盘

若生产环境仍使用旧路径，需同步修改网关与静态资源目录别名。GitHub 默认链接已改为占位 `your-org/shanchuang-space`，发布前请替换为真实仓库。

**涉及模块**：`README.md`、`README.docker.md`、`package.json`、`vite.config.js`、`src/router`、`index.html`、`server/index.mjs`、`nginx.conf`、`src/views/Home.vue`、`Canvas.vue`、`AppHeader.vue`、`stores/projects.js`、`hooks/useCanvasGroupNodeExecuteBridge.js`、`config/providers.js`、`config/models.js`（注释）、`docs/**/*.md`（批量替换与标题）。
