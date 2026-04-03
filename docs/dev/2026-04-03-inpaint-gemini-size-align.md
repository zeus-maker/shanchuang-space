# 局部重绘 / Gemini 参考图：输出尺寸与首图对齐

## 背景与原因

星图侧 **Gemini 生图**（含编辑/Inpaint）在带参考图时，若 **`imageConfig.aspectRatio`** 与 **首帧图实际宽高比** 不一致，可能返回 **`Inpaint image must match the requested width and height`** 类错误。另，从图片节点创建「局部重绘」工作流时，**ImageConfig** 曾固定 **`2048x2048`**，与底图分辨率不一致时，**Seedream** 等接口同样易报尺寸不匹配。局部重绘虽已生成 **蒙版**，但未作为第二张子图提交，模型侧无法按蒙版编辑。

## 修改点

- 新增 **`src/utils/imageDimensions.js`**：`loadImageNaturalSize`、`pickClosestBananaSizeKey`（对齐 Banana 比例 key）、`pickClosestSeedreamSizeKey`（在 Seedream 预设分辨率中选最近项）。
- **`useImageGeneration`**（`useApi.js`）：星图 **Gemini 3.x** 路径在存在 **`params.image`** 时，按 **首张参考图** 尺寸推导 **Banana 比例**，再写入 **`generationConfig.imageConfig.aspectRatio`**（2.5 Flash Image 仍仅 **`responseModalities`**）。
- **`ImageConfigNode`**：`inpaintMode` 下从连线源 **图片节点** 读取 **`maskData`**，将 **`[底图, 蒙版]`** 作为 **`params.image`**；**Seedream** 时在生成前按底图尺寸 **自动更新 `size`**。
- **`ImageNode`**：创建局部重绘 **ImageConfig** 时，按当前图尺寸选择 **Seedream `size`**，不再写死 **2048x2048**。

## 复盘

- **`Unknown parameter: 'model'`**：Gemini **`generateContent`** 请求体不应含顶层 **`model`**（模型在 URL 路径中）；当前实现已如此。若仍出现，需核对 **Base URL** 是否误指到 **`generateContent`** 却走了 **`/v1/images/generations`** 体，或渠道/网关在转发时混用格式。
- **涉及模块**：`src/utils/imageDimensions.js`、`src/hooks/useApi.js`、`src/components/nodes/ImageConfigNode.vue`、`src/components/nodes/ImageNode.vue`。
