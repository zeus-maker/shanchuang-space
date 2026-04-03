# 星图（Astraflow / UCloud Modelverse）渠道接入

## 背景与原因

产品需要在「多渠道 + 统一 Key」架构下增加 **星图（UCloud Modelverse，国内网关 `https://api.modelverse.cn`）**：文本走 OpenAI 兼容接口，生图为 **Gemini `generateContent` + `x-goog-api-key`**（与 `/v1/images/generations` 不同），Seedance 1.5 Pro 走 **异步任务** `/v1/tasks/submit` 与 `/v1/tasks/status?task_id=`。

原先 `usesVolcengineVideoApi` / `usesVolcengineImageApi` 会在**任意当前渠道**下把 Seedance 1.5 / Seedream 强制路由到火山，导致在 Chatfire 或星图下选同一模型时仍走 Ark。现改为：**仅当当前渠道为 `volcengine` 时才强制走火山**；星图侧用 Modelverse 文档中的任务与 Gemini 路径。

## 修改点

- **`src/config/providers.js`**：新增 `astraflow` 渠道（聊天/任务端点、Seedance 请求体、`ASTRAFLOW_DEFAULT_MODELS`）。
- **`src/config/models.js`**：内置星图专用图模与 `CHAT_MODELS` 默认文本；Seedance 1.5 支持 `astraflow`；`usesModelverseGeminiImage` 供生图分支判断。
- **`src/hooks/useApi.js`**：图/视频 provider 与火山解耦；星图 Gemini 生图；Modelverse 任务轮询解析 `output.task_status` / `urls`；任务 ID 支持 `output.task_id`。
- **`src/api/modelverseTextModels.js`**：`GET /v1/models` 拉取文本模型写入 Pinia。
- **`src/stores/pinia/models.js`**：`replaceCustomChatModelsByProvider`；移除默认占位 API Key。
- **`src/components/ApiSettings.vue`**：保存星图配置时拉取文本模型并应用默认三模型。
- **`src/utils/request.js`**：存在 `x-goog-api-key` 时不自动加 Bearer；错误信息识别欠费/配额类提示。
- **节点配置**：`ImageConfigNode` / `VideoConfigNode` 的「已配置」判断与上述火山条件一致。
- **`docs/todo/2-星图集成PRD.md`**：去掉误写入的明文 Key，修正默认图模名称。

## 复盘

- 官方视频文档任务查询为 **Query** `task_id`，故 `videoQuery` 使用 `?task_id={taskId}` 占位替换。
- PRD 与测试说明中 **禁止** 出现真实 Key；已在文档中改为控制台申请与轮换说明。

**涉及模块**：`config/providers.js`、`config/models.js`、`hooks/useApi.js`、`api/modelverseTextModels.js`、`stores/pinia/models.js`、`components/ApiSettings.vue`、`utils/request.js`、`components/nodes/ImageConfigNode.vue`、`components/nodes/VideoConfigNode.vue`。
