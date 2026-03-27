# 火宝无限画布 (AI Canvas) - 核心系统架构与代码复刻指南 (AI Replication Prompt)

> **文档目的**：本文档专门为 AI 代码生成器（如 Cursor, Trae, Claude 3.5 Sonnet）编写。它提供了极端详细的代码结构、数据流定义、核心算法和组件 Props，以便 AI 能够 1:1 像素级复刻或重构该无限画布系统。

---

## 1. 核心技术栈与宏观架构

- **框架**: Vue 3 (Composition API, `<script setup>`)
- **状态管理**: Pinia (使用 `ref` 和 `computed` 的 Setup Store 模式)
- **图引擎**: `@vue-flow/core` (v1.48.1), `@vue-flow/background`, `@vue-flow/controls`, `@vue-flow/minimap`
- **UI & 样式**: Tailwind CSS, Naive UI (`n-dropdown`, `n-button`, `n-tooltip`)
- **架构范式**: 纯前端 Local-First 架构。视图层 (`Canvas.vue`) 仅作渲染，所有业务逻辑（连线规则、数据组装、API调用、状态机）被下沉到自定义节点 (`CustomNodes`) 和 Pinia Store 中。

---

## 2. 核心状态管理 (Pinia Store: `canvas.js`)

**必须实现以下精确的数据结构和 API：**

### 2.1 State (响应式变量)
```javascript
const nodes = ref([])       // 必须双向绑定到 VueFlow 的 v-model:nodes
const edges = ref([])       // 必须双向绑定到 VueFlow 的 v-model:edges
const canvasViewport = ref({ x: 0, y: 0, zoom: 1 }) 
const history = ref([])     // 快照栈
const historyIndex = ref(-1)
```

### 2.2 数据模型契约 (Data Schema)
AI 在生成节点时，必须严格遵守以下 Schema：
```typescript
// 节点 Schema
interface CanvasNode {
  id: string; // 格式: `node_${Date.now()}`
  type: 'text' | 'imageConfig' | 'image' | 'videoConfig' | 'video' | 'llmConfig';
  position: { x: number; y: number };
  zIndex: number;
  data: {
    label: string;      // 节点头部显示的标题
    content?: string;   // TextNode 专有: 提示词内容
    model?: string;     // ConfigNode 专有: 当前选中的模型ID
    url?: string;       // 展示节点专有: 生成结果的URL
    loading?: boolean;  // UI 状态
    error?: string;     // 错误堆栈
    executed?: boolean; // Orchestrator 专有: 标记该节点是否被自动执行完毕
    outputNodeId?: string; // ConfigNode 生成结果后，指向的下游节点ID
  }
}

// 边 Schema
interface CanvasEdge {
  id: string; // 格式: `edge_${source}_${target}_${Date.now()}`
  source: string;
  target: string;
  sourceHandle?: string; // 用于多端口锚点 (如: 'top', 'bottom')
  targetHandle?: string;
  type: 'default' | 'promptOrder' | 'imageRole' | 'imageOrder';
  data?: {
    promptOrder?: number; // 文本顺序，如 1, 2, 3
    imageRole?: 'first_frame_image' | 'last_frame_image' | 'input_reference';
  }
}
```

### 2.3 核心 Store 方法 (必须实现)
- `addNode(type, position, data)`: 生成自增 ID，合并默认配置，压入 `nodes.value`。
- `addEdge(sourceId, targetId, options)`: 检查防重，推入 `edges.value`。
- `saveToHistory(force = false)`: 使用 `JSON.parse(JSON.stringify({nodes, edges}))` 进行深拷贝。需要实现 `isBatchOperation` 锁机制。
- `undo()` / `redo()`: 操作 `historyIndex` 并覆盖 `nodes.value` 和 `edges.value`。

---

## 3. 画布主引擎 (Canvas.vue)

### 3.1 VueFlow 初始化
```html
<VueFlow
  v-model:nodes="nodes"
  v-model:edges="edges"
  v-model:viewport="viewport"
  :node-types="nodeTypes"
  :edge-types="edgeTypes"
  :min-zoom="0.1"
  :max-zoom="2"
  :snap-to-grid="true"
  :snap-grid="[20, 20]"
  @connect="onConnect"
>
```

### 3.2 `onConnect` 智能连线拦截器
这是核心业务逻辑。AI 必须复刻这段逻辑：
```javascript
const onConnect = (params) => {
  const sourceNode = nodes.value.find(n => n.id === params.source)
  const targetNode = nodes.value.find(n => n.id === params.target)
  
  let edgeType = 'default'
  let edgeData = {}

  // 规则 1: 文本连入生图/大模型节点，必须分配 promptOrder 边
  if (sourceNode.type === 'text' && ['imageConfig', 'llmConfig'].includes(targetNode.type)) {
    edgeType = 'promptOrder'
    // 算法: 计算当前 target 下已有的 promptOrder 数量 + 1
    const existingEdges = edges.value.filter(e => e.target === params.target && e.type === 'promptOrder')
    edgeData = { promptOrder: existingEdges.length + 1 }
  }
  // 规则 2: 图片连入视频节点，必须分配 imageRole 边
  else if (sourceNode.type === 'image' && targetNode.type === 'videoConfig') {
    edgeType = 'imageRole'
    edgeData = { imageRole: 'first_frame_image' } // 默认首帧
  }

  // 拦截非法连接
  if (sourceNode.type === 'text' && targetNode.type === 'video') return false;

  canvasStore.addEdge({ ...params, type: edgeType, data: edgeData })
}
```

---

## 4. 自定义节点深度解剖 (Custom Nodes)

所有自定义节点必须包裹在 `<div class="node-card bg-white shadow-md rounded-xl">` 中，并使用 Vue Flow 的 `<Handle>` 组件暴露连接点。

### 4.1 数据源节点: `TextNode.vue`
- **UI 结构**: 顶部带拖拽把手，中部为富文本输入框 (`contenteditable` 或 `<textarea>`)。
- **特有功能 (@ 引用)**:
  用户输入 `@` 时，弹出当前画布中其他文本/图片节点的列表。
  存储格式: `@[node_12345]`。
  渲染格式: 解析文本，将 `@[node_12345]` 渲染为带背景色的 Chip（徽标）。

### 4.2 计算引擎节点: `ImageConfigNode.vue`
这是系统的“发动机”，AI 需要重点复刻其“输入回溯算法”。
- **状态机**: `Idle` -> `Loading` (显示进度条/骨架屏) -> `Success` -> `Error` (边框变红)。
- **输入回溯算法 (`getConnectedInputs`)**:
  当用户点击“生成”时，该节点必须向上游遍历：
  1. 查找所有 `target === self.id` 且 `type === 'promptOrder'` 的连线。
  2. 根据 `edge.data.promptOrder` 排序。
  3. 提取对应 `sourceNode` 的 `data.content`，拼接为最终的 Prompt。
  4. 解析 Prompt 中的 `@[node_xxx]` 引用，如果引用的是图片节点，提取其 `data.url` 作为 Image2Image 的参考图。
- **输出逻辑**:
  API 返回 URL 后，该节点调用 `addNode('image')` 在自己右侧生成一个展示节点，并调用 `addEdge` 将自己与展示节点相连。

### 4.3 语义化边: `ImageRoleEdge.vue`
- **实现原理**: 
  使用 `<BaseEdge />` 渲染贝塞尔曲线 (`getBezierPath`)。
  使用 `<EdgeLabelRenderer>` 在曲线中心点 `(labelX, labelY)` 渲染一个绝对定位的 `<n-dropdown>`。
- **互斥算法**:
  当用户将此边切换为 `first_frame_image` 时，必须触发一个 Watcher：
  扫描所有连接到同一 `target` 的其他 `imageRole` 边，如果发现有其他边也是 `first_frame_image`，强制将其降级为 `input_reference`。

---

## 5. 自动编排引擎 (useWorkflowOrchestrator.js)

这是系统的“大脑”，负责将自然语言转化为画布拓扑图。AI 需要实现基于 Promise 的状态监听机。

### 5.1 编排原语 (Primitives)
必须实现这两个核心拦截器，它们利用 Vue 的 `watch` 监听 Pinia Store，将响应式变化转化为 Promise。
```javascript
// 等待配置节点执行完毕（生成了输出节点 ID）
const waitForConfigComplete = (configNodeId, timeoutMs = 300000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject('Timeout'), timeoutMs)
    const unwatch = watch(() => canvasStore.nodes, (newNodes) => {
      const node = newNodes.find(n => n.id === configNodeId)
      if (node?.data?.error) { unwatch(); clearTimeout(timer); reject(node.data.error) }
      if (node?.data?.executed && node?.data?.outputNodeId) {
        unwatch(); clearTimeout(timer); resolve(node.data.outputNodeId)
      }
    }, { deep: true })
  })
}

// 等待输出节点 (如 ImageNode) 的 URL 加载完毕
const waitForOutputReady = (outputNodeId, timeoutMs = 60000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject('Timeout'), timeoutMs)
    const unwatch = watch(() => canvasStore.nodes, (newNodes) => {
      const node = newNodes.find(n => n.id === outputNodeId)
      if (node?.data?.url) {
        unwatch(); clearTimeout(timer); resolve(node.data.url)
      }
    }, { deep: true })
  })
}
```

### 5.2 工作流执行范例 (Text -> Image -> Video)
AI 在复刻时，必须能生成类似以下的异步拓扑构建代码：
```javascript
const executeTextToVideo = async (prompt, startPos) => {
  // 1. 创建文本节点
  const textId = addNode('text', startPos, { content: prompt })
  
  // 2. 创建图片配置节点，开启 autoExecute
  const imgConfigId = addNode('imageConfig', { x: startPos.x + 300, y: startPos.y }, { autoExecute: true })
  addEdge(textId, imgConfigId, { type: 'promptOrder', data: { promptOrder: 1 } })

  // 3. 阻塞等待：图片生成完毕
  const imgNodeId = await waitForConfigComplete(imgConfigId)
  await waitForOutputReady(imgNodeId)

  // 4. 创建视频配置节点
  const vidConfigId = addNode('videoConfig', { x: startPos.x + 900, y: startPos.y }, { autoExecute: true })
  
  // 5. 将文本和生成的图片一起连入视频节点
  addEdge(textId, vidConfigId, { type: 'promptOrder', data: { promptOrder: 1 } })
  addEdge(imgNodeId, vidConfigId, { type: 'imageRole', data: { imageRole: 'first_frame_image' } })
}
```

---
**提示给 AI 开发者**: 
1. 严格遵守数据模型中 `data` 对象的定义，不要将业务属性挂载到节点根级别。
2. 任何节点的坐标变动、参数修改都必须通过调用 `canvasStore` 的 actions 完成，严禁直接变异组件内部的 Local State。
3. 渲染 Edge 上的交互组件时，必须加上 `nodrag nopan` 的 CSS 类，防止点击事件冒泡导致画布意外平移。
