# ImageConfigNode 多图展示 UI + 分辨率修复

**日期**: 2026-03-28  
**文件**: `src/components/nodes/ImageConfigNode.vue`

---

## 问题 12：分辨率/尺寸设置未生效

### 根本原因

节点从画布持久化状态恢复时，`data.size` 可能未存储。此时 `localSize` 回退到默认值 `'2048x2048'`，对非 Seedream 模型（如 nano-banana 系列，size key 格式为 `'16x9'`、`'1x1'` 等）会向 API 发送无效的尺寸字符串，导致模型忽略该参数，始终以默认分辨率生成。

### 修复方案

在 `onMounted` 末尾增加 size 有效性校验：

```javascript
const validSizes = getModelSizeOptions(localModel.value, localQuality.value)
if (validSizes.length > 0) {
  const isValidSize = validSizes.some(o => o.key === localSize.value)
  if (!isValidSize) {
    const cfg = getModelConfig(localModel.value)
    const defaultSize = cfg?.defaultParams?.size
      || validSizes[Math.floor(validSizes.length / 2)]?.key
      || validSizes[0].key
    localSize.value = defaultSize
    updateNode(props.id, { size: defaultSize })
  }
}
```

同时在 `handleGenerate` 中加入 `console.log` 打印实际发送参数，方便追查：

```javascript
console.log('[ImageConfigNode] 生成参数:', { model, size, quality, n })
```

---

## 问题 12-B：选 n 张但只生成 1 张（`useApi.js`）

### 根本原因

火山引擎 Seedream API 与 OpenAI DALL-E 3 均**不支持单次请求 `n > 1`**，API 会静默忽略该参数，始终只返回 1 张图片。

### 修复方案（`src/hooks/useApi.js`）

重构 `useImageGeneration.generate`：将单次 HTTP 请求逻辑提取为内部 `callOnce()` 辅助函数（每次固定传 `n=1`），再用 `Promise.all` 并发发起 `count` 个请求，最后将结果 `flat()` 合并：

```javascript
const count = Math.max(1, params.n || 1)
const results = await Promise.all(Array.from({ length: count }, () => callOnce()))
const adaptedData = results.flat()
```

这样不依赖 API 是否原生支持批量，任何 n（1/2/4）都能正确返回对应数量的图片。

---

## 功能 13：多张图堆叠 + 展开网格 UI

### 需求

- 生成多张图时（n=2 或 n=4），以"卡片叠放"效果展示，前景显示主图，背景显示其他图片的偏移投影
- 支持展开为 2 列网格，每张图片独立显示"下载"和"设为主图"操作
- "设为主图"后该图作为整个节点的输出供下游节点使用
- "收起"按钮回到堆叠视图

### 新增状态

| 变量 | 类型 | 说明 |
|---|---|---|
| `mainImageIndex` | `ref(number)` | 当前主图下标，默认 0 |
| `isGridExpanded` | `ref(boolean)` | 是否展开网格 |

### 新增方法

| 方法 | 说明 |
|---|---|
| `setMainImage(i)` | 设为主图，更新 `data.mainImageIndex` 与 `data.selectedUrl` |
| `expandGrid()` | 展开网格，调用 `updateNodeInternals` 刷新高度 |
| `collapseGrid()` | 收起为堆叠视图 |
| `downloadImage(url, i)` | 通过隐藏 `<a>` 触发下载 |

### 预览区三种状态

```
previewImages.length === 0          → 空态：图标 + 图生图/图片高清提示
previewImages.length === 1          → 单图：全尺寸预览 + hover 重新生成
previewImages.length > 1
  isGridExpanded = false            → 堆叠视图：主图前景 + 背景卡片偏移效果
  isGridExpanded = true             → 展开网格：2 列 + 每格操作按钮
```

### 堆叠视图 CSS 原理

背景卡片使用绝对定位，每张叠加 `translate(offset * 6px, offset * -6px) scale(1 - offset * 0.025)`，offset = 1, 2，营造景深感。前景卡片 z-index 最高，显示主图。  
"展开"按钮和"重新生成"图标默认透明，`hover` 时淡入。

### 主图输出机制

`setMainImage(i)` 执行后：

```javascript
updateNode(props.id, { mainImageIndex: i, selectedUrl: urls[i] })
```

下游节点通过连接边读取该节点的 `data.selectedUrl` 作为参考图输入。

### 生成完成后自动展开

当生成结果数量 > 1 时，自动将 `isGridExpanded` 设为 `true` 并刷新节点高度，方便用户立即查看所有结果并选择主图。

---

## 引入的新图标

`DownloadOutline`（来自 `@vicons/ionicons5`）用于下载按钮。
