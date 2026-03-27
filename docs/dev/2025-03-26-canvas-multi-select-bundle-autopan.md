# 画布：多选批量操作、贴边平移与组引用（打组）

**日期：** 2025-03-26

## 背景与原因

- **现象 / 需求：** 需要左键框选多个节点并批量操作（保存素材、批量下载、创建副本、打组）；希望悬停靠近边缘时画布能自动滑动；打组后下游节点能把多个节点内容合并为输入。
- **此前缺口：** 实现完成后未按流程写入 `docs/dev`，与 `.cursor/rules` 约定不一致。

## 修改点

- `src/views/Canvas.vue` — `selection-key-code` + `pan-on-drag=false`（左键框选；平移依赖空格+拖移）；`pane-mouse-move/leave` 贴边自动 `setViewport`；多选工具栏（保存到素材、批量下载、创建副本、打组）。
- `src/stores/canvas.js` — `duplicateNodes` 批量克隆子图内边。
- `src/utils/bundleRefs.js` — `aggregateBundleTexts` / `aggregateBundleRefImages`（嵌套组、防重复访问）。
- `TextNode.vue` — 有 `bundleMemberIds` 时展示组引用说明。
- `LLMConfigNode.vue`、`ImageConfigNode.vue`、`VideoConfigNode.vue` — 连接输入与 `@` 解析时展开组引用（文案与参考图/视频首帧等）。

## 复盘

- **功能类交付** 若用户希望与修复同等留档，应在 `docs/dev` 增文件或在 `docs/dev/README` 中明确「功能迭代也写记录」的触发条件。
- 合并 Cursor 规则后，只需维护单一 `alwaysApply` 文件，避免两条规则内容交叉引用不同文件名。
