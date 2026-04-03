---
name: 星图 PRD 模型清单落库
overview: "将 PRD 第 8–55 行所列图片/视频模型以「写死 key + 展示 label + provider: astraflow」写入 `models.js`，并扩展 Gemini 生图路由以覆盖 2.5/3.x 系列；视频侧为每条模型补齐 `type` 等 UI 所需字段，默认沿用现有异步轮询；官方真实 `model` 字符串需与 UCloud 文档对齐校验。"
todos:
  - id: verify-keys
    content: 对照 UCloud Modelverse 文档/GitHub，确定 PRD 各行对应的准确 model key（重点 Vidu、doubao-seedream）
    status: completed
  - id: models-image-batch
    content: 在 models.js 批量新增 astraflow 图片项（可抽 ASTRAFLOW_IMAGE_MODEL_ENTRIES）
    status: completed
  - id: models-video-batch
    content: 在 models.js 批量新增 astraflow 视频项并补全 type/ratios/durs 等
    status: completed
  - id: gemini-multi-id
    content: 扩展 usesModelverseGeminiImage + useApi 动态 generateContent URL
    status: completed
  - id: docs-dev-update
    content: 更新 docs/dev 留档说明清单范围与已知限制
    status: completed
isProject: false
---

# 星图 PRD 模型清单写入 `models.js`

## 现状（与 PRD 的差距）

- `[src/config/models.js](src/config/models.js)` 中星图图模目前仅有 `**gemini-3.1-flash-image-preview**`；星图视频仅 `**doubao-seedance-1-5-pro-251215**`（与 PRD 的 `doubao-seedance-1-5-pro` 为同一能力，建议 **继续用完整 ID** 作为 `key`，避免与文档不一致）。
- `[src/hooks/useApi.js](src/hooks/useApi.js)` 里星图 Gemini 生图路径写死为 `.../gemini-3.1-flash-image-preview:generateContent`，且 `[usesModelverseGeminiImage](src/config/models.js)` 只匹配该一条。
- `[astraflow.requestAdapter.video](src/config/providers.js)` 对 **非 seedance** 已输出「文本 + 通用 parameters」的 `tasks/submit` 形态；**不保证**与 Wan/Vidu/Sora/可灵等各家在 Modelverse 上的真实字段一致，但与你要求的「先把 ID 写进配置」不冲突——后续可按接口文档再加分支。

## 实施要点

### 1. 图片模型：批量写入 `IMAGE_MODELS`

- 为 PRD 列表中每一条增加一项：`provider: ['astraflow']`，`label` 用 PRD 括号内商品名或简短中文 + 英文 id，`key` **优先采用平台文档中的 `model` 字符串**（含 `black-forest-labs/...`、`Qwen/...` 等斜杠形式）。
- **尺寸/参数策略（减少一次性踩坑）**：
  - **Gemini 系**（`gemini-2.5-flash-image`、`gemini-3-pro-image`、已有 `gemini-3.1-flash-image-preview`）：`sizes` 复用现有 `[BANANA_SIZE_OPTIONS](src/config/models.js)`，`defaultParams` 与当前星图 Gemini 项一致。
  - **OpenAI 兼容生图**（`gpt-image-1`、`gpt-image-1.5` 及多数 Flux/Qwen 等）：先复用项目已有 `[IMAGE_SIZE_OPTIONS](src/config/models.js)` 或 `BANANA_SIZE_OPTIONS` + 通用 `defaultParams`；若某模型在 Modelverse 仅支持特定 size 枚举，可在该项上加 `tips` 或后续收窄 `sizes`。
  - `**doubao-seedream`**：PRD 仅为前缀；`key` 应以 [UCloud 文档/模型列表](https://docs.ucloud.cn/modelverse/README) 为准（可能与现有 Chatfire 的 `doubao-seedream-4-5-251128` 不同）。注意 `[usesVolcengineImageApi](src/config/models.js)` 对任意包含 `doubao-seedream` 的 key 为 true，**仅在 `currentProvider === 'volcengine'` 时才走火山**；星图渠道仍会走当前生图链路，无需改该 helper。

可选整理方式：在 `models.js` 内定义 `ASTRAFLOW_IMAGE_MODEL_ENTRIES` 常量数组，再 `IMAGE_MODELS.push(...ASTRAFLOW_IMAGE_MODEL_ENTRIES)` 或展开合并，避免单文件过长难 diff。

### 2. 扩展星图 Gemini 生图（多模型 ID）

- 将 `**usesModelverseGeminiImage`** 从「单字符串包含」改为 **显式列表或稳定规则**（推荐：匹配 `gemini-2.5-flash-image`、`gemini-3-pro-image`、`gemini-3.1-flash-image-preview`，或 `^gemini-.+-image` 一类正则，避免误伤未来非生图 gemini 文本模型）。
- 在 `[useImageGeneration](src/hooks/useApi.js)` 的 Gemini 分支中，把请求 URL 从硬编码改为：  
`${base}/v1beta/models/${encodeURIComponent(params.model)}:generateContent`  
请求体仍按 [Modelverse Gemini 文档](https://raw.githubusercontent.com/UCloudDoc-Team/modelverse/master/api_doc/image_api/gemini-3.1-flash-image.md) 使用 `responseModalities` + `imageConfig`（不同 Gemini 版本若字段有差异，再按文档微调）。

### 3. 视频模型：批量写入 `VIDEO_MODELS`

- 为 PRD 中每条（除已与现有 Seedance 1.5 重复的 `doubao-seedance-1-5-pro`）新增 `provider: ['astraflow']` 的条目。
- **必填 UI 字段**（与 `[ScriptNode.vue](src/components/nodes/ScriptNode.vue)` 等对 `VIDEO_MODELS` 的用法一致）：
  - `**type`**：`OpenAI/Sora2-T2V`、`Wan2.x-T2V` 等标为 `t2v`；`*-I2V`、图生类标为 `i2v`；文图一体标为 `t2v+i2v`（若文档不明确，先标 `t2v+i2v` 或 `t2v` 并在 `tips` 说明）。
  - `**ratios` / `durs` / `resolutions` / `defaultParams`**：首版可与现有 Seedance 块对齐（`[VIDEO_RATIO_LIST](src/config/models.js)`、`5/10` 秒、`480p/720p/1080p`），避免配置节点无选项；后续按各模型文档收紧。
- **Vidu 七条**：PRD 为中文场景名，**真实 `model` 字符串必须以 Modelverse 视频 API 文档为准**（建议在实现前从 [UCloudDoc-Team/modelverse `api_doc/video_api](https://github.com/UCloudDoc-Team/modelverse/tree/master/api_doc/video_api)` 核对）；计划中实现为：`label` 用 PRD 文案，`key` 用文档中的 model id（若暂时只有内部代号，可用 `tips: '待核对 model id'` 占位，但不宜长期留假 key）。

### 4. 默认模型与文档

- `[ASTRAFLOW_DEFAULT_MODELS](src/config/providers.js)` 中图片默认已是 `gemini-3.1-flash-image-preview`，一般 **无需因扩列表而改动**。
- 更新 `[docs/dev/2026-04-03-astraflow-modelverse-provider.md](docs/dev/2026-04-03-astraflow-modelverse-provider.md)`：说明「PRD 清单已写入 `models.js`」、Gemini 多 ID 共用一个 generateContent 通道、非 Seedance 视频为通用 submit 体、**Vidu/部分模型需按官方文档二次核对 key 与 body**。

### 5. 验证建议（实现后）

- 星图渠道下：下拉能列出新增图/视频模型；选 **Gemini 2.5 / 3 Pro** 生图各跑一次；选 **1～2 个非 Seedance 视频** 试创建任务（若 4xx，再按该模型文档改 `astraflow.requestAdapter.video`）。

## 风险与边界（写入计划，避免预期偏差）

- **仅扩 `models.js` 不等于所有模型已可成功调用**：Modelverse 上不同厂商的 `tasks/submit` **input/parameters 结构可能不同**，当前通用体可能只对部分模型有效。
- **PRD 与官方 `model` 字符串不一致时，以官方为准**（尤其是 Vidu、`doubao-seedream` 具体版本号）。

