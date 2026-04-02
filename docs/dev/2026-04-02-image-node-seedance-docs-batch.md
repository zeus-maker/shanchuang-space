# 图片节点多图与 Seedance 修复 + 文档资源整理

**日期**: 2026-04-02

## 背景与原因

1. **图片配置节点**：多图生成时 API 常不支持单次 `n>1`，且恢复画布时 `size` 可能与当前模型选项不一致，导致分辨率无效；多图结果需要更清晰的预览与主图选择。
2. **视频（Seedance）**：Chatfire 适配层曾用错误文本 flag、遗漏尾帧、未透传 `generate_audio`，与火山官方约定不一致，批量视频里音频开关不生效。
3. **文档与资源**：旧 `doc/` 截图与 `docs/sprint/1-change.md` 需迁移或下线，补充官方 API 链接说明与 sprint 示意图，便于协作与对照文档。

## 修改点

- **`ImageConfigNode.vue`**：多图堆叠/展开网格、主图与下载、挂载时校验并纠正 `size`；多图生成完成后默认展开等（细节见 `docs/dev/2026-03-28-image-config-node-multi-image-ui.md`）。
- **`useApi.js`**：图片生成按 `n` 并发多次单张请求并合并结果；视频创建透传 `generateAudio`。
- **`providers.js`**：Seedance 视频请求改为顶层 `resolution`/`ratio`/`duration` 等；支持首尾帧 `role`；`generate_audio` 可由参数控制。
- **`ScriptNode.vue`**：批量视频参数携带 `generateAudio`，并与上述 API 行为对齐（详见 `docs/dev/2026-03-28-seedance-api-params-fix.md`）。
- **文档与静态资源**：新增 `docs/api_url.md`（火山图片/视频 API 文档索引）；图片迁入 `docs/doc/`；sprint 相关 UI 截图放入 `docs/images/`；删除原 `doc/` 下同名资源及过时 `docs/sprint/1-change.md`。

## 复盘

留档拆分为 2026-03-28 两篇（图片节点、Seedance）与本篇总览，便于按主题查阅；后续若再有大批次合并提交，可继续用「日期 + 批次」一篇总览索引子文档。

**涉及模块**：`src/components/nodes/ImageConfigNode.vue`、`ScriptNode.vue`、`src/hooks/useApi.js`、`src/config/providers.js`、`docs/` 下新增与迁移文件。
