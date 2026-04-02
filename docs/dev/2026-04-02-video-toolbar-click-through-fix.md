# 修复：视频节点与左侧工具栏点击无响应

## 背景与原因

1. **视频预览**：分镜编辑面板打开时，预览区上方有一层默认 `opacity-0` 的悬浮工具条，但使用了 `pointer-events-auto`，不可见仍会盖住下层 `<video>`，导致无法点击播放等控件。
2. **左侧工具栏**：工具栏与「添加节点」子菜单的 `z-index`（10 / 20）在部分层级下可能低于画布内 elevated 节点或连接层，出现点击被画布吞掉的情况。

## 修改点

- `VideoNode.vue`：悬浮工具条默认 `pointer-events-none`，仅在 `group-hover/vid` 时启用 `pointer-events-auto`，与显隐一致。
- `Canvas.vue`：左侧 `aside` 提升至 `z-[200]`、节点类型菜单 `z-[210]`，并显式 `pointer-events-auto`。

## 复盘

若后续再叠透明层，应遵循「隐藏且不参与交互」时用 `pointer-events-none`，避免与可见性脱节。
