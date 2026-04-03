# 分镜图刷新后不显示 + Alt+S 保存

## 背景与原因

1. **刷新后分镜图空白**  
   星图 Gemini 等返回的成图为 **`data:image/*;base64`**，写入节点的 `generatedUrls`。保存项目时 **`cleanNodeForStorage` 会剔除所有 `data:`**（避免撑爆 localStorage），刷新加载后 `generatedUrls` 为空，预览无图。  
   此前 **`/api/media/cache` 仅支持 http(s) 拉取**，无法把内联图落盘，故无法换成可持久化的路径。

2. **希望显式保存**  
   自动保存有防抖延迟；整组执行完成后若立刻刷新，可能尚未写入。用户需要 **Alt+S** 立即把当前画布写入 localStorage。

## 修改点

1. **`server/index.mjs`**  
   - 将 **`POST /api/media/cache`** 提前到全局 `express.json(2mb)` 之前，并单独使用 **`25mb`** body（与首帧上传一致，避免大 base64 413）。  
   - 支持 **`dataUrl`**：与 `sourceUrl` 二选一，解析后写入 `uploads`，返回 **`localKey`**。

2. **`src/utils/localMediaServer.js`**  
   - 新增 **`cacheDataUrlToServer`**，供文生图节点把内联结果写入本地缓存。

3. **`ImageConfigNode.vue`**  
   - 生成成功后：对 **`data:`** 结果调用 **`cacheDataUrlToServer`**，并把 **`generatedUrls`** 中对应项改为 **`/api/media/file/...`**（与 `generatedLocalKeys` 对齐）；仍支持 http 远程走 **`cacheRemoteToServer`**。  
   - 若未启动媒体服务导致缓存失败，提示用户运行 **`npm run server`** 后再保存。

4. **`src/stores/projects.js`**  
   - **`zipPersistableGeneratedAssets`**：`generatedUrls` 与 **`generatedLocalKeys`** 成对过滤 **`data:` / `blob:`** 并截断条数，避免键值长度不一致导致预览逻辑退化为失效外链。  
   - 配额紧张时的第二轮压缩保留 **`/api/`** 本地路径（不再只保留 `http` 开头）。

5. **`Canvas.vue`**  
   - **Alt+S**（非输入框内）调用 **`saveProject()`** 并提示「已保存当前项目」。  
   - **整组执行**全部成功后再 **`saveProject()`** 一次，减少「刚跑完就刷新丢图」的概率。

## 复盘

- 分镜工作流需 **同时开前端 + `npm run server`**，否则 data URL 无法落盘，刷新后仍可能丢图（会有 Naive UI 警告）。  
- 若需把说明写进 README 的「媒体服务」小节，可另起一条 PR/提交。
