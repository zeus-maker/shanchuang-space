# 整组执行无反应 + imageConfig 节点提示词显示与回填

## 背景与原因

用户反馈两个问题：

1. **整组执行弹框点击确认后没有反应**：`confirmGroupExecute` 调用 `requestGroupNodeExecute(nodeId)`，后者向 window 派发自定义事件，各节点的 `registerCanvasGroupNodeExecuteBridge` 监听后调用 `handleGenerate('auto')`。问题在于 `handleGenerate` 内部的 `getConnectedInputs()` 只从"通过 edge 连接的文本节点"收集提示词。脚本生成器创建的分镜 imageConfig 节点，其提示词直接写在 `data.prompt`，没有连接文本节点，导致 `prompt` 为空、函数提前 `return` 而不调用 `resolve()`，使 Promise 永远悬挂直到 600s 超时，表现为"没有反应"。

2. **图片节点看不到提示词**：ImageConfigNode 没有显示或编辑 `data.prompt` 的输入区，用户无法确认脚本生成器填入的分镜提示词，也无法手动修改。

## 修改点

- **新增提示词 textarea**（`ImageConfigNode.vue` 模板）：在画质/尺寸选择下方加了一个 3 行的 textarea，绑定 `localPrompt`，支持直接编辑；`@mousedown.stop` + `@keydown.stop` + `.nodrag` 防止拖拽冲突。
- **`localPrompt` 响应式状态**：初始化自 `props.data?.prompt`，同步监听外部写入（脚本生成器重新生成时覆盖）；修改时通过 `updateNode` 写回 `data.prompt`。
- **`getConnectedInputs()` 最终 fallback**：在函数最末尾，当 `combinedPrompt` 为空且无参考图时，使用 `localPrompt.value` 作为 prompt 来源。这样分镜节点即使没有连接文本节点，也能正确提取到提示词，使 `handleGenerate` 正常执行、Promise 正常 resolve，整组执行不再卡死。

## 复盘

`getConnectedInputs()` 的设计假设"提示词必须来自外部连接"，未考虑节点自持 prompt 的情况。此次通过 fallback 做到向后兼容：连接文本节点时优先使用连接，无连接时使用自身存储的 prompt；用户可感知两种方式，设计一致性良好。

**涉及模块：** `src/components/nodes/ImageConfigNode.vue`
