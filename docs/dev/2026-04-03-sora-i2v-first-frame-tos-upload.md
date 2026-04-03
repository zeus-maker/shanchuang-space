# Sora2 图生视频首帧：base64 转火山 TOS 公网 URL

## 背景与原因

星图（Modelverse）任务里 **Sora2 图生视频**（`sora2_i2v`）的 `first_frame_url` **不接受** data URL / base64，只接受可被服务端拉取的 **公网 http(s)** 地址。画布上本地上传的首帧多为 `data:image/...;base64,...`，直接提交会导致接口不符合要求。

## 修改点

- 在 **`createVideoTaskOnly`** 中，当当前渠道为 **astraflow** 且模型任务样式为 **`sora2_i2v`** 时，若 `first_frame_image` 不是公网 http(s)，则先调用媒体服务 **`POST /api/media/sora-frame-upload`**，将 data URL 上传到 **火山引擎 TOS**，用返回的 URL 替换后再走原有提交流程。
- **媒体服务**（`server/index.mjs`）新增上述路由：使用 **`@volcengine/tos-sdk`** 执行 `putObject`，对象 ACL 为 **public-read**；公网地址默认拼 **`https://${bucket}.tos-${region}.volces.com/${key}`**，可通过 **`VOLCENGINE_TOS_PUBLIC_BASE_URL`** 改为 CDN 等前缀。该路由须挂在 **全局 `express.json(2mb)` 之前**，否则大图 base64 会 **413**。
- 前端工具 **`src/utils/soraFirstFrameUrl.js`** 封装「已是 http(s) 则跳过 / 否则上传」与错误提示。
- **README**、**`.env.example`** 补充服务端 TOS 环境变量说明（密钥不入库）。

## 复盘

- 未配置 TOS 时上传接口返回 **503**，前端会提示配置媒体服务或使用公网首帧链接；生产部署若暴露媒体服务，需结合内网或网关鉴权评估风险。
- **413 Payload Too Large**：全局 `express.json({ limit: '2mb' })` 先于路由执行时，大体积 data URL 会在进入 `sora-frame-upload` 的 `25mb` 解析器前被拒绝。已将 **`/api/media/sora-frame-upload` 注册在全局 `express.json` 之前**，仅该路径使用 `25mb`。
- **涉及模块**：`src/hooks/useApi.js`、`src/utils/soraFirstFrameUrl.js`、`server/index.mjs`、`package.json`。
