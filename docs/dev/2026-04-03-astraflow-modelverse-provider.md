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
- **PRD 模型清单**：`models.js` 增加星图图/视频全量内置项；`providers.js` 导出 `buildAstraflowVideoSubmit`；`useApi.js` 拦截 `openai_videos` 与动态 Gemini 路径。

## 复盘

- 官方视频文档任务查询为 **Query** `task_id`，故 `videoQuery` 使用 `?task_id={taskId}` 占位替换。
- PRD 与测试说明中 **禁止** 出现真实 Key；已在文档中改为控制台申请与轮换说明。

**涉及模块**：`config/providers.js`、`config/models.js`、`hooks/useApi.js`、`api/modelverseTextModels.js`、`stores/pinia/models.js`、`components/ApiSettings.vue`、`utils/request.js`、`components/nodes/ImageConfigNode.vue`、`components/nodes/VideoConfigNode.vue`。

---

## 补充（PRD 图/视频模型清单落库）

- **`docs/todo/2-星图集成PRD.md`** 第 8–55 行所列星图图模、视频模已写入 **`src/config/models.js`**（`ASTRAFLOW_IMAGE_MODELS` / `ASTRAFLOW_VIDEO_MODELS`），`key` 与 **UCloudDoc-Team/modelverse** 文档中的 `model` 对齐；Vidu 等同场景多条目共用平台 model 时，使用 **UI 专用 key** + **`submitModel`** + **`modelverseTaskStyle`**（及 Vidu 的 **`modelverseViduType`**）。
- **`buildAstraflowVideoSubmit`**（`src/config/providers.js`）按 `modelverseTaskStyle` 组装 `/v1/tasks/submit`：**OpenAI Sora2 任务**、**Wan**、**MiniMax Hailuo**、**可灵 Kling**、**Veo 3.1**、**Vidu 各子类型**、**Seedance** 等分支与文档字段对齐；未识别样式时回退为旧版通用 `input.content` 体（可能不适用于部分厂商）。
- **Gemini 多图模**：`usesModelverseGeminiImage` 使用正则 `^gemini-.+image`，生图 URL 为 `/v1beta/models/{encodeURIComponent(model)}:generateContent`。
- **`sora-2`（OpenAI 官方 /v1/videos + multipart）**：画布侧 **显式拦截**（`modelverseTaskStyle: openai_videos`），提示改用 Sora2 文生/图生 **任务** 模型；完整 multipart 串联可后续单独立项。
- **边界**：Vidu 延长 / 对口型 / MV 等依赖 **视频 URL、音频 URL** 等，当前仍主要复用首帧/尾帧连接位传递 URL，复杂表单需在节点层继续扩展；各模型时长/分辨率枚举与文档不完全一致时以接口返回为准逐步收紧配置项。
