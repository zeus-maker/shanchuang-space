# 文生图：豆包 Seedream 按模型路由至火山引擎

**日期：** 2025-03-26

## 背景与原因

- **现象：** 全局 API 渠道选 DeepSeek（或其它非火山）时，文生图配置节点中选用「豆包 Seedream」点击「立即生成」，请求仍发往当前全局渠道的 Base URL（如 DeepSeek），导致生图失败或走错服务。
- **根因：** `useImageGeneration` 统一使用 `modelStore.getImageEndpoint()` 与 `useProvider()` 的适配器，二者均绑定 **当前全局 `currentProvider`**，未按 **生图模型** 区分；豆包 Seedream 实际需调用火山引擎 Ark 的 OpenAI 兼容生图接口。

## 修改点

- `src/config/models.js` — 新增 `usesVolcengineImageApi(modelKey)`，识别 `doubao-seedream` 系列模型。
- `src/hooks/useApi.js` — `useImageGeneration.generate`：对 Seedream 使用 `volcengine` 的 baseUrl、endpoint、request/response 适配器及 `apiKeysByProvider.volcengine`；请求头显式携带对应 Key；其它模型仍走原全局渠道逻辑；补充将 `quality`、`n` 传入请求体。
- `src/config/providers.js` — 完善 `volcengine` 的 `requestAdapter.image` / `responseAdapter.image`，与 Ark 常见 OpenAI 兼容返回格式对齐。
- `src/api/image.js` — `generateImage` 支持传入额外 `headers`（用于火山 Key，避免被拦截器用全局 Key 覆盖）。
- `src/utils/request.js` — 若请求已带 `Authorization`，拦截器不再覆盖。
- `src/components/nodes/ImageConfigNode.vue` — `isConfigured`：Seedream 校验火山引擎 Key，其它模型仍校验当前渠道 Key。

## 复盘

- **可改进点：** 若后续增加更多「强制指定渠道」的模型，可改为在 `IMAGE_MODELS` 上配置 `imageApiProvider` 字段，避免仅靠 key 字符串包含判断。
- **风险与注意事项：** 使用 Seedream 时用户必须在 API 设置中单独配置火山引擎 Key；文档与 UI 提示需清晰，避免误以为仅配 DeepSeek 即可生图。
- **后续建议：** 视频类若存在类似「模型与全局渠道不一致」的情况，可对 `useVideoGeneration` 做同类拆分。
