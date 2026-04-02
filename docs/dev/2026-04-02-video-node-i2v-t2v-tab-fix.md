# 视频节点：文生/图生 Tab 切回修复

## 背景与原因

「图生视频」Tab 使用 `hasFirstFrame = !!(首帧 URL && !缩略图 error)`。切到「文生视频」后图生区块卸载，首帧 `<img>` 的销毁在部分环境下会触发 `@error`，将 `firstFrameImgBroken` 置为 true，导致 `hasFirstFrame` 变假，**图生 Tab 被 disabled**，无法切回。

## 修改点

- 引入 `hasFirstFrameUrl`：仅依据 `videoGenParams.first_frame_image` 是否有有效字符串，用于 Tab 禁用、自动回落到文生、图生重新生成的可用性判断。
- 缩略图加载失败单独展示「预览失败」，与「无首帧」区分；角标「1」在仍有 URL 时保留。
- `watch(activeEditTab)`：切回图生时重置 `firstFrameImgBroken`，便于缩略图重新加载。

## 复盘

「能否图生」应以持久化字段为准，不应与缩略图解码失败耦合。
