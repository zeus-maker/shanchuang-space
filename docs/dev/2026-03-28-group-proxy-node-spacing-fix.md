# 打组框虚拟代理节点 + imageConfig 行间距修复

## 背景与原因

用户反馈两个问题：

1. **连线设计不合理**：生成分镜时，脚本节点向打组框内每个 imageConfig 节点各连一条边，导致线条密集、语义不准确。用户期望"打组框作为整体"接受一条入口边，类似复合节点的数据流视觉。

2. **图片节点上下间距过大**：打组框内 imageConfig 节点行与行之间空白过多，视觉上非常松散。根因是 `estimateNodeSize` 把 imageConfig 高度估算为 520px（保留了已被注释掉的图片预览区高度），而实际渲染只有约 280px（仅配置区：模型/尺寸/画质选择 + 生成按钮），导致行间步长 = 540 + 16 = **556px**，而节点实际高度仅 ~280px，产生约 276px 的多余空白。

---

## 修改点

### 1. 新增 `GroupProxyNode`（打组框虚拟入口节点）

在打组框左边缘垂直居中处放置一个琥珀色小圆点（12×12px），作为脚本节点到整个打组框的连线终点，语义上代表"数据进入分镜组"。

- 代理节点类型为 `groupProxy`，已注册到全局 `nodeTypes`
- 生成分镜完成后自动创建，定位在打组框 `frame.x, frame.y + frame.height/2`
- 代理节点加入打组框的 `memberIds`，因此：拖动打组框时随之移动；Delete 键删组时随之删除
- 脚本节点只向代理节点连一条边，不再向每个 imageConfig 节点各连一条

### 2. 修正 imageConfig 高度估算

`estimateNodeSize` 中 `imageConfig` 从 `[340, 520]` 改为 `[340, 280]`，贴近实际渲染高度。

- 打组框计算时优先使用 Vue Flow 实测 `dimensions`，此修改主要影响节点渲染前（等待期）的边界估算准确性
- 分镜排列步长从 556px 压缩为 292px（280 + 12），行间视觉间距约 12px

---

## 复盘

- `GroupProxyNode` 是一个轻量级"锚点节点"方案，不依赖 Vue Flow 对分组边的原生支持，扩展成本低；缺点是用户可以单独拖动/删除代理节点（暂无限制，影响不大）。
- imageConfig 高度估算长期偏差，建议后续在组件高度变化时同步更新 `estimateNodeSize`。

**涉及模块：** `src/components/nodes/GroupProxyNode.vue`（新增）、`src/components/nodes/ScriptNode.vue`、`src/stores/canvas.js`、`src/views/Canvas.vue`
