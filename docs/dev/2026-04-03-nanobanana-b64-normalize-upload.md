# Nano Banana Pro 等 base64 生图：归一化后落盘 uploads

## 背景与原因

星图 **Gemini（Nano Banana / Pro）** 等多走 `inlineData` / 部分聚合接口走 **`b64_json`**。若上游把**裸 base64**放进 `url` 字段（或仅返回 `b64_json`），前端原先只识别 **`data:`** 前缀才会调用 **`cacheDataUrlToServer`**，导致：

- 未写入 `uploads`，刷新后 localStorage 清理掉非持久化内容则不显示；或  
- 大块裸 base64 被写进 `generatedUrls`，占满配额。

## 修改点

1. **`src/utils/normalizeInlineImageUrl.js`**（新）  
   将裸 base64 / `b64_json` 规范为 **`data:image/png;base64,...`**；已是 `data:`、`http(s):`、`/` 开头则不变。

2. **`src/config/providers.js`**  
   **Chatfire、OpenAI、星图 astraflow、火山 volcengine** 的 `responseAdapter.image` 在组装 `{ url }` 时对 `url | b64_json | b64Json` 做 **`normalizeInlineImageUrl`**。

3. **`src/hooks/useApi.js`** — **`extractGeminiImageParts`**  
   兼容 **`inline_data`**（snake_case）；`data` 已为完整 `data:` 时不再重复拼接。

4. **`ImageConfigNode.vue`**  
   生成结果落盘循环入口对每条 URL 再 **`normalizeInlineImageUrl`**，保证任意路径进入 **`cacheDataUrlToServer`**。

## 复盘

- 与既有 **`POST /api/media/cache` + `dataUrl`**、`npm run server` 要求一致；未启动媒体服务时仍有提示。
