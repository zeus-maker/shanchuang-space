# Sora2 图生视频：请求尺寸与首帧像素对齐

## 背景与原因

星图 / 上游在 Sora2 图生视频场景下要求 **`parameters.size`（宽×高字符串）与首帧参考图实际像素一致**。此前前端仅用面板上的 **16:9 / 9:16** 映射为固定 **`1280x720` / `720x1280`**，而分镜图常来自 Seedream 等为 **`2048x2048`** 等分辨率，导致上游返回 **`Inpaint image must match the requested width and height`**（HTTP 400）。

## 修改点

1. **`useApi.js`（`createVideoTaskOnly`）**  
   在为首帧做完公网 URL（如 TOS）处理后，对首帧 **`loadImageNaturalSize`**，成功则写入 **`soraI2vPixelSize`**（如 `2048x2048`）；相对路径先补全为当前页 **origin** 再读尺寸。支持调用方显式传入 **`params.soraI2vPixelSize`**。读尺寸失败时仍回退为原 **`sora2TaskSize(面板比例)`**（若首帧为跨域且无 CORS，仍可能回退失败，需依赖 CDN 允许匿名跨域或同源图）。

2. **`providers.js`（`buildAstraflowVideoSubmit` · `sora2_i2v`）**  
   若存在合法 **`WxH` 像素串** 则用作 **`parameters.size`**，否则沿用 **`sora2TaskSize`**。

3. **批量视频面板（`Canvas.vue`、`ScriptNode.vue`）**  
   当当前视频模型为 **`modelverseTaskStyle === 'sora2_i2v'`** 时，**不再展示可选的比例与生成品质**，改为说明文案；底部摘要显示 **「随首帧尺寸」**；积分估算不再按分辨率档位浮动（该模型请求体不使用面板分辨率）。

## 复盘

- 单节点视频面板若仍暴露与 Sora2 i2v 不符的比例选项，可再与节点侧配置对齐；本次优先覆盖 **批量生成** 与 **提交体尺寸** 主路径。
