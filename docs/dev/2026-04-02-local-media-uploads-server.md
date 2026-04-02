# 本地媒体缓存服务（uploads + 优先本地 + 视频 task 刷新）

**日期**: 2026-04-02

## 背景与原因

生成类 API 返回的对象存储链接通常带短时效签名，项目数据仅存 URL 时，隔日打开画布会出现 `Request has expired`。需要在**可控磁盘**上持久化文件，并能在本地缺失或链接失效时尽量自动恢复。

## 修改点

- 新增 **`server/index.mjs`**（Express）：`POST /api/media/cache` 从 `sourceUrl` 拉取并写入 `MEDIA_ROOT/<projectId>/`（默认仓库根目录 `uploads/`）；`GET/HEAD /api/media/file/:projectId/:filename` 提供静态读取；可选 `SERVE_STATIC` 同进程托管 `dist` 下 `/huobao-canvas` 前端。
- 前端工具：**`localMediaServer.js`**（请求缓存、拼本地 URL、HEAD 探测）、**`generatedMediaAssets.js`**（文生图 `generatedUrls` 与 `generatedLocalKeys` 对齐预览）、**`applyVideoNodeCache.js`**（视频节点统一落盘字段）。
- **文生图节点**：生成后并发缓存；预览优先本地；挂载时补全缺失的本地文件；`img` `@error` 时尝试按远程源再缓存。**`selectedUrl` / `generatedUrls` 仍为远程**，供下游视频等 API 使用。
- **视频节点**：轮询成功后落盘并保留 **`videoTaskId`**；展示用 `localVideoKey` 优先；挂载与 `video` 播放错误时按「本地 → sourceUrl → task 查询」顺序恢复。
- **视频配置 / 批量视频（Canvas、Script）**：同步返回 `url` 时同样走落盘逻辑。
- **`useApi`**：导出 **`fetchVideoResultUrlOnce`**，供刷新签名地址。
- **工程**：`package.json` 增加 `express`、`concurrently` 与 `server` / `dev:all` / `start` 脚本；`vite.config.js` 代理 `/api/media`；`nginx.conf` 增加反代示例；**Dockerfile** 改为构建后由 Node 同时提供静态与媒体 API；**`.gitignore`** 忽略 `uploads/`。

## 复盘

若仅部署静态资源而不启媒体服务，前端会静默跳过缓存，行为与旧版一致。生产环境若拆分 Nginx 与 Node，务必为 `/api/media` 配置反代并放大 `proxy_read_timeout` 以适配大视频下载。

**涉及模块**：`server/index.mjs`、`src/utils/localMediaServer.js`、`generatedMediaAssets.js`、`applyVideoNodeCache.js`、`hooks/useApi.js`、`VideoNode.vue`、`ImageConfigNode.vue`、`VideoConfigNode.vue`、`Canvas.vue`、`ScriptNode.vue`、`vite.config.js`、`nginx.conf`、`Dockerfile`、`README.md`、`.env.example`。
