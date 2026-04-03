# Modelverse Gemini 生图：generateContent 与官方文档对齐

## 背景与原因

PRD 指出选择星图 Gemini 图模后调用方式与 [UCloud Modelverse 图模文档](https://docs.ucloud.cn/modelverse/api_doc/image_api/gemini-3.1-flash-image)（仓库索引见 `docs/rag/官方文档地址.md`）不一致。对照 [UCloudDoc-Team/modelverse](https://github.com/UCloudDoc-Team/modelverse) 中 `gemini-3.1-flash-image.md`、`gemini-3-pro-image.md`、`gemini-2.5-flash-image.md` 示例后，主要差异为：

- **URL 模型 ID**：`gemini-3-pro-image` 在官方 curl 中应为 **`gemini-3-pro-image-preview`**，原先直接用画布 key 拼路径会打到错误端点。
- **请求体**：官方要求 `contents[].role` 为 **`user`**；原先仅传 `parts` 未带 `role`。
- **generationConfig**：**Gemini 2.5 Flash Image** 文档示例仅含 `responseModalities`，**不含** `imageConfig`；**3.x 图模**才使用 `imageConfig.aspectRatio` / `imageSize`。原先对所有 Gemini 图模统一带 `imageConfig`，与 2.5 文档不符，可能导致接口报错或行为异常。
- **参考图**：文档中文生/图生使用 `parts` 内 `inlineData` 或 URL 的 `fileData`；原先星图分支未把 `params.image` 写入请求体。

## 修改点

- **`src/config/models.js`**：`MODELVERSE_GEMINI_GENERATE_CONTENT_PATH_ID` 与 `resolveModelverseGeminiGenerateContentPathId`（当前映射 Pro → `-preview`）；`isGemini25FlashImageModel` 区分 2.5 与 3.x 请求体。
- **`src/hooks/useApi.js`**：`buildModelverseGeminiUserParts` 组装 `text` + `inlineData` / `fileData`；Gemini 星图分支按模型拆分 `generationConfig`；`generateContent` URL 使用解析后的路径模型 ID。

## 复盘

- `gemini-3.1-flash-image-preview` 与 `gemini-2.5-flash-image` 与文档路径一致，无需额外映射；后续若平台调整预览 ID，可只在映射表扩展。
- 官方 curl 中 3.x 可选 `tools`（如 `google_search`），当前未附带，避免无关依赖；若业务需要可再按模型开关追加。

**涉及模块**：`src/config/models.js`、`src/hooks/useApi.js`

---

## 再补充（Gemini 请求 URL 与 Base 配置）

- **现象**：Base URL 填成 `https://api.modelverse.cn/v1`（OpenAI 习惯）或 `https://api.modelverse.cn/v1beta` 时，再拼接 `/v1beta/models/...` 会得到 `/v1/v1beta/...`、`/v1beta/v1beta/...` 等错误路径，网关返回 404 或非预期错误。
- **修改**：`buildModelverseGeminiGenerateContentUrl` 仅使用配置 URL 的 **origin**，再拼官方路径 `/v1beta/models/{id}:generateContent`；新增 `normalizeAstraflowModelverseBaseUrl`，星图渠道保存 API 设置时把 Base 规范为 origin；`ApiSettings` 占位文案提示勿带 `/v1`。
- **涉及模块**：同上 + `src/components/ApiSettings.vue`
