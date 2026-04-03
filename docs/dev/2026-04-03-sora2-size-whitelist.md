# Sora2 图生/文生视频：parameters.size 仅四种白名单

## 背景与原因

此前将首帧**实际像素**（如 `1376x768`）直接写入 `parameters.size`，用于规避「Inpaint 与请求宽高不一致」类错误。星图侧现返回 **`invalid_value`**，明确 **`size` 只能是**：

`720x1280`、`1280x720`、`1024x1792`、`1792x1024`。

任意 `WxH` 会被 400 拒绝。

## 修改点

1. **`src/config/providers.js`**  
   - 定义四种预设；**`sora2_i2v`**：若存在 `soraI2vPixelSize`（首帧宽高），按**宽高比 + 横竖**在四种中选最接近的一项，并结合 **`resolution` 是否含 1080** 在 **720p 档**（1280×720 / 720×1280）与 **1080p 档**（1792×1024 / 1024×1792）之间取舍；无首帧像素时回退 **`sora2TaskSizeFromPanel(params.size, params.resolution)`**。  
   - **`sora2_t2v`**：`size` 改为 **`sora2TaskSizeFromPanel`**，使选 **1080p** 时可走 1792 档。

2. **`Canvas.vue` / `ScriptNode.vue` 批量视频**  
   - 恢复 Sora2 图生下的**比例、生成品质**选项（用于上述档位与横竖倾向）；顶部增加一句说明四种固定尺寸。

## 复盘

- 若上游仍要求首帧像素与所选 `size` 完全一致，需在服务端或上传前**缩放首帧**到四种之一；当前仅保证请求字段合法。
