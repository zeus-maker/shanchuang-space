# Seedance 视频生成 API 参数修复

日期: 2026-03-28

## 背景

对照火山引擎 Seedance 官方 API 文档，发现代码中视频生成请求存在多处参数问题，导致分辨率、比例、尾帧、音频等设置可能未正确传递给 API。

官方文档参考:
- 创建视频生成任务: https://www.volcengine.com/docs/82379/1520757
- SDK 示例: https://www.volcengine.com/docs/82379/1366799

## 发现的问题

### 1. 文本命令 flag 名称不匹配

**之前**: 参数以 `--resolution`、`--ratio` 等 flag 嵌入 text prompt 中发送。

**问题**: 火山引擎 Ark 官方文本命令使用缩写 `--rs`、`--rt`，并非 `--resolution`、`--ratio`。直连火山引擎时这些 flag 会被忽略，参数不生效。

**修复**: 改为使用顶层 JSON 字段（`resolution`、`ratio`、`duration`），这是官方 API 明确支持的标准方式，同时兼容火山引擎直连和 Chatfire 代理。

### 2. 尾帧图片 (last_frame_image) 未发送

**之前**: chatfire Seedance 适配器仅处理 `first_frame_image`，完全忽略 `last_frame_image`。

**问题**: 批量视频生成的首尾帧功能中，尾帧图片从未发送给 API。

**修复**: 在 content 数组中添加尾帧图片条目，并设置 `role: "last_frame"`。首帧图片在存在尾帧时也显式设置 `role: "first_frame"`。

官方首尾帧格式:
```json
{
  "content": [
    { "type": "text", "text": "..." },
    { "type": "image_url", "image_url": { "url": "first.jpg" }, "role": "first_frame" },
    { "type": "image_url", "image_url": { "url": "last.jpg" }, "role": "last_frame" }
  ]
}
```

### 3. generate_audio 无法从 UI 控制

**之前**: `createVideoTaskOnly` 不传递 `generateAudio` 参数，适配器硬编码为 `true`。

**问题**: 批量视频面板的音频开关 (`bvAudio`) 不起作用。

**修复**:
- `useApi.js`: `createVideoTaskOnly` 将 `params.generateAudio` 传入 `requestData`
- `providers.js`: 适配器读取 `params.generateAudio`（未指定时默认 `true`）
- `ScriptNode.vue`: 批量视频参数中加入 `generateAudio: bvAudio.value`

## 修改的文件

| 文件 | 改动 |
|------|------|
| `src/config/providers.js` | 重写 chatfire Seedance video 适配器：text prompt 不再嵌入 --flag，改用顶层字段；添加 last_frame 支持和 role 字段 |
| `src/hooks/useApi.js` | `createVideoTaskOnly` 新增 `generateAudio` 参数传递 |
| `src/components/nodes/ScriptNode.vue` | 批量视频 params 添加 `generateAudio: bvAudio.value` |

## 最终请求格式示例

### 文生视频
```json
{
  "model": "doubao-seedance-1-5-pro-251215",
  "content": [{ "type": "text", "text": "prompt" }],
  "resolution": "720p",
  "ratio": "16:9",
  "duration": 5,
  "generate_audio": true
}
```

### 首帧图生视频
```json
{
  "model": "doubao-seedance-1-5-pro-251215",
  "content": [
    { "type": "text", "text": "prompt" },
    { "type": "image_url", "image_url": { "url": "..." } }
  ],
  "resolution": "720p",
  "ratio": "16:9",
  "duration": 5,
  "generate_audio": true
}
```

### 首尾帧图生视频
```json
{
  "model": "doubao-seedance-1-5-pro-251215",
  "content": [
    { "type": "text", "text": "prompt" },
    { "type": "image_url", "image_url": { "url": "first.jpg" }, "role": "first_frame" },
    { "type": "image_url", "image_url": { "url": "last.jpg" }, "role": "last_frame" }
  ],
  "resolution": "720p",
  "ratio": "16:9",
  "duration": 5,
  "generate_audio": false
}
```
