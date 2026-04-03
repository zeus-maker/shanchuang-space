# localStorage 配额：项目持久化瘦身与多级回退

## 背景与原因

画布节点中 **`videoGenParams.first_frame_image`**、**`generatedUrls`**、**`data:` 预览** 等体积极大，写入 **`shanchuang-space-projects`** 时易超过浏览器 **localStorage** 配额（约 5MB），触发 **`QuotaExceededError`**。原 `cleanNodeForStorage` 未覆盖视频首帧与多图列表，且配额回退成功后未与磁盘对齐内存中的 **`projects`**，下一次自动保存仍会撑爆配额。

## 修改点

- **`cleanNodeForStorage`**：剔除 **`videoGenParams`** 中 data URL 首帧/尾帧、**`generatedUrls`** 中的 base64、**`thumbnail`/`selectedUrl`** 的 data URL；对 **`node.data`** 做 **`deepStripHeavyStrings`**（去掉嵌套 **`data:`**、超长字符串截断至约 12 万字符）。
- **`cleanEdgeForStorage`**：对 **`edge.data`** 做同样深度剥离。
- **`saveProjects`**：配额溢出时多级回退——先压缩多图 URL（仅保留少量 `http` 链接）、再清空较早项目画布、再只保留 5 个项目并清空节点、最后仅保留 1 个项目壳；每步成功写入后 **`loadProjects()`** 或截断 **`projects.value`**，避免内存与磁盘不一致导致反复失败。

## 复盘

- 被剥离的 **data URL 首帧** 在重新打开项目后需重新从图节点连接或重新上传；**远程 URL** 与 **本地 media key** 仍尽量保留。
- **Inpaint 尺寸不匹配**、**Unknown parameter: model** 属星图/模型侧请求体或选模问题，与本次存储修复无关；Sora2 图生视频参数以 [UCloud Modelverse OpenAI-Sora2-I2V](https://docs.ucloud.cn/modelverse/api_doc/video_api/OpenAI-Sora2-I2V) 为准排查。
- **涉及模块**：`src/stores/projects.js`。
