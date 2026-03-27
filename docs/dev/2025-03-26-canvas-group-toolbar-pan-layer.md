# 画布打组：框对齐、工具栏外置、右键平移与节点层级

**日期：** 2025-03-26

## 背景与原因

- **框与选区不一致：** 分组矩形若用粗略估算尺寸会偏大或偏位；需优先使用 Vue Flow 量到的 `dimensions`，并统一内边距常量，使虚线框更贴近真实节点占用范围。
- **工具栏点在框内：** 半透明底框与工具条叠在一起时，容易误触分组或点不到按钮。将「选分组」与「操作按钮」移到**打组框上沿之上**，底框仅作视觉底色且**不接收指针事件**。
- **平移 vs 缩放：** `pan-on-drag` 保持 **`false`**。**Apple 桌面（Mac 平台 / Mac OS X UA，排除 iPhone/iPod）** 开启 **`pan-on-scroll`**：触控板双指滑动走 Vue Flow 的滚轮平移分支；**⌃ + 滚轮**（`zoom-on-pinch`）仍缩放。**其它环境** 关闭 `pan-on-scroll`、保留 **`zoom-on-scroll`**，鼠标滚轮缩放。**空白画布右键** 使用 `@pane-context-menu` 弹出自定义菜单（适应视图 / 放大 / 缩小），`preventDefault` 避免系统菜单。
- **节点应在上层：** `#zoom-pane` 在节点之后绘制时，分组底框必须用负 `z-index`（或等价手段），并为 `.vue-flow__nodes`（及边）设置相对更高的层级，保证组内节点可正常拖动。

## 用户可见行为

1. **打组虚线框**更贴成员节点外轮廓（仍随成员移动自动更新）。
2. **分组名称条**贴在框的**上方**；选中该组后，**工具栏**再叠在名称条**上方**（均不在半透明填充区域内）。
3. **Mac**：双指滑动平移画布；**⌃ + 滚轮或捏合**缩放；空白处**右键**打开画布菜单。**Windows 等**：滚轮缩放；空白处右键同样打开菜单。**左键拖拽**在空白处框选多选（`selection-key-code` 为 `true`）。
4. 点击**普通节点**会取消当前「选中分组」状态，避免分组工具栏一直挡在画面上。
5. **底色 / 排列**下拉在 naive-ui 传入对象型 `key` 时仍能正确更新分组。

## 涉及文件（索引）

- `src/stores/canvas.js` — `GROUP_FRAME_PAD`、`getNodeBodySize`、`computeGroupBounds` / `layoutGroupMembers` 与尺寸相关的逻辑。
- `src/views/Canvas.vue` — 同上；`:pan-on-drag="false"`；`canvasWheelPan` 控制 `:pan-on-scroll` / `:zoom-on-scroll`；`@pane-context-menu` + `Teleport` 画布菜单；`:elevate-nodes-on-select`；`:deep` 节点/边 `z-index`；`onNodeClick` 清空 `selectedGroupId`。

## 复盘

- 若个别节点类型在首帧尚未写入 `dimensions`，框仍可能短暂不准；可依赖后续 `nodes-change` 触发的 bounds 重算，或针对该类型补充估算。
- Windows 无触控板时仅靠滚轮缩放 + 底部按钮缩放；若需在 Windows 触控板上双指平移，可把 `canvasWheelPan` 判定放宽（需注意与滚轮缩放的取舍）。
