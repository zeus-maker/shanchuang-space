# 火山 Key 从 .env 注入，Seedream / Seedance 1.5 Pro 直连 Ark

**日期：** 2025-03-26

## 背景与原因

- 需求：生图选 Seedream、生视频选 Seedance 1.5 Pro 时统一走火山引擎；密钥优先从项目根目录 `.env` 读取，便于本地与 CI 分离管理，避免强依赖仅 UI 内填写的 Key。
- 原状：生图已能按模型切火山，但 Key 主要来自 Pinia/API 设置；视频侧此前未按 Seedance 1.5 Pro 强制走 Ark；异步轮询在 `VideoConfig` 与 `VideoNode` 各用一份 `useVideoGeneration()`，无法在轮询请求上复用创建任务时的鉴权与 URL。

## 修改点

- `src/config/volcengineEnv.js` — `VITE_VOLCENGINE_API_KEY`、`VITE_VOLCENGINE_BASE_URL`（可选）读取。
- `src/config/models.js` — `usesVolcengineVideoApi`（`doubao-seedance-1-5-pro`）。
- `src/config/videoPollContext.js` — 按 `taskId` 保存火山轮询用的 `endpointTemplate` 与 `Authorization`。
- `src/hooks/useApi.js` — 生图：火山 Base 优先 `VITE_VOLCENGINE_BASE_URL` / 默认 Ark；Key 优先 env 再回落 API 设置。视频：`createVideoTaskOnly` / `pollVideoTask` 对 1.5 Pro 走火山；Seedance 请求体仅在「火山 1.5 Pro」或「渠道为 chatfire」时用火宝侧适配，避免误配到其它渠道。
- `src/api/video.js` — `createVideoTask` / `getVideoTaskStatus` 支持额外 `headers`。
- `src/config/providers.js` — `volcengine.responseAdapter.video` 与火宝对齐，便于解析 URL。
- `ImageConfigNode.vue` / `VideoConfigNode.vue` — 「已配置」判断纳入 `getVolcengineApiKey()`。
- `.gitignore` — 忽略 `.env`、`.env.*.local`；`.env.example` 提交占位说明（不含真实密钥）。

## 复盘

- **Vite 限制：** 仅 `VITE_*` 会在构建期注入；改 `.env` 后需重启 `npm run dev`；生产镜像需在构建参数或运行环境中提供同名变量，勿把 `.env` 打进公开镜像。
- **安全：** 真实 Key 只放本地 `.env`（已 gitignore），勿写入文档或提交记录。
- **后续：** 若 Ark 任务查询路径与占位符与现配置不一致，只需改 `providers.volcengine.endpoints.videoQuery` 与上下文模板逻辑。
