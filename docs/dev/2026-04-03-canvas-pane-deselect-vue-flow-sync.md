# 画布：空白取消选中与 Vue Flow 内部态同步

## 背景与原因

仅把 `nodes` 里 `selected: false` 写回 Pinia，有时与 Vue Flow 内部 `nodeLookup` 选中态不一致；拖拽节点会走 `applyNodeChanges`，视觉上才「恢复」。另 `paneClickDistance` 默认为 0，轻微手抖会导致 `pane-click` 不触发。

## 修改点

- 使用 `useVueFlow()` 的 `removeSelectedElements()`（经 `clearVueFlowSelection`）在：点到组外空白、`selectGroup`、打组成功后清理选中，与 Flow 内部钩子对齐。
- `onMounted` 中 `setPaneClickDistance(8)`，提高空白处点击识别率。

## 复盘

与 Vue Flow 协作时，选中态应以 store API 为准，避免只改 v-model 数组字段。
