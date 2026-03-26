# 画布平移/缩放流畅度优化

**日期：** 2025-03-26

## 背景与原因

- **现象：** 拖动画布或缩放时明显卡顿。
- **根因：** `@viewport-change` 在 d3-zoom 过程中高频触发，每次调用 `updateViewport` 会写入 `canvasViewport` 并反复重置防抖 `saveProject`，主线程与响应式开销过大。
- **交互预期：** 按住拖动画布平移；滚轮仅缩放（不显式开启滚轮平移）；与 Vue Flow 默认行为对齐并减少误触。

## 修改点

- `src/views/Canvas.vue` — 将持久化改为 `@viewport-change-end`；显式 `:pan-on-scroll="false"`、`:zoom-on-scroll="true"`、`:zoom-on-pinch="true"`、`:pan-on-drag="true"`、`:zoom-on-double-click="false"`；`max-zoom` 提至 4；视口容器 `touch-action: none` 减少触控误滚动。

## 复盘

- 缩放百分比仍绑定 `useVueFlow().viewport`，拖拽过程中 UI 仍实时更新；仅项目持久化延后到手势结束。
- 若需「中键/空格」单独平移，可再接入 `pan-activation-key-code` 等配置。
