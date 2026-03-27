# 画布 Sprint1：悬停平移与区域打组

**日期：** 2025-03-26

## 背景与原因

- 按 `docs/sprint/1-change.md`「修改1」：去掉空格+拖拽平移，改为空白画布上移动鼠标平移；打组改为半透明框（不新建组引用文本节点）；点击框显示工具栏（底色、排列、整组执行说明、工具箱、解组、批量下载）。

## 修改点

- `src/stores/canvas.js` — `canvasGroups` 持久化（`memberIds`、`fillKey`）；`computeGroupBounds` / `estimateNodeSize`；`addCanvasGroup`、`removeCanvasGroup`、`updateCanvasGroup`、`layoutGroupMembers`；历史与 `saveProject`/`loadProject` 含 `canvasGroups`；删节点时裁剪分组。
- `src/views/Canvas.vue` — Vue Flow 变换层内绘制分组框与工具栏；`movementX/Y` 平移视口；多选「打组」走 `addCanvasGroup`；整组执行弹窗展示拓扑序与说明（自动执行留后续）；工具箱写入 `localStorage` 键 `huobao-canvas-toolbox`。

## 复盘

- 整组自动串联各节点生成 API 未接，弹窗内已说明；旧版「组引用」文本节点仍可由存量数据与 `bundleRefs` 解析保留兼容。
