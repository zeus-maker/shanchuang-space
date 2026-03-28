# 批量视频生成（分镜脚本 → 视频组）

**日期**: 2026-03-28  
**文件**: `src/views/Canvas.vue`（主入口）, `src/utils/videoConcat.js`, `src/utils/groupZipDownload.js`, `src/components/nodes/ScriptNode.vue`（备用入口）, `src/config/models.js`

## 2026-03-28 更新：按钮迁移到组工具栏

"批量生成视频"按钮从 ScriptNode 内部工具栏迁移到 Canvas.vue 的**组工具栏**中。当用户选中一个包含 `imageConfig` 节点的分镜图组时，组工具栏（排列/整组执行/解组/批量下载）右侧会出现"批量生成视频"按钮。

- **触发条件**: `selectedGroupHasImageConfigs` 计算属性检测组内是否包含 imageConfig 类型节点
- **面板/逻辑**: 完整的批量视频设置面板和生成逻辑已复制到 Canvas.vue
- **场景数据获取**: `findScriptScenesForGroup()` 通过组内 groupProxy → 边 → ScriptNode 反向查找关联的分镜脚本场景数据（videoMotionPrompt 等）
- ScriptNode 中的按钮和面板作为备用入口保留

## 2026-03-28 更新：面板锚定在打组框下方 + 自动剪辑 + 批量 zip

- **面板位置**: 不再使用全屏 `Teleport` 遮罩；设置面板放在 Vue Flow `#zoom-pane` 内，用 `groupBatchVideoPanelStyle(g)` 贴在当前选中**分镜打组框下沿**（画布坐标），随画布缩放与平移。
- **自动剪辑**: 当选中组内全部为已完成的 `video` 节点（有 `url`、无 loading/错误）时，工具栏显示「自动剪辑」。点击后动态加载 `videoConcat.js`，用 FFmpeg.wasm（CDN 拉取 `@ffmpeg/core`）按节点网格顺序拼接；单段则直接 `fetch` 成 blob 下载。跨域导致 `fetch` 失败时会提示改用批量下载或本地合并。
- **批量下载**: 组内多于 1 个可下载的 `image`/`video` 节点时，动态加载 `groupZipDownload.js`，打包为**一个 zip**（zip 内为真实媒体二进制，非链接）。**仅 1 个**时通过 `fetch` + Blob 触发浏览器「保存文件」（`.mp4`/图片），不再用 `window.open` 仅打开播放页。若 CORS 无法拉取字节，则退回新开标签并提示「另存为」；整包 zip 全失败时改为**间隔逐个**触发文件下载。实现见 `src/utils/mediaDownload.js`。

---

## 功能概述

在分镜脚本生成器（ScriptNode）的工具栏新增"批量生成视频"按钮，点击后弹出底部设置面板，可配置视频生成参数后一键将所有分镜图转换为视频。

## 设置面板（Batch Video Panel）

画布内锚定在分镜打组框下方（与组工具栏同一坐标系）；设计参考 `docs/images/11-批量生成视频UI.png`。

### 可配置项

| 参数 | 选项 | 默认值 |
|------|------|--------|
| 模型 | Seedance 1.5 Pro / 1.0 Pro / 1.0 Pro Fast / 1.0 Lite (i2v) | Seedance 1.5 Pro |
| 比例 | 16:9 / 4:3 / 1:1 / 3:4 / 9:16 / 21:9（跟随模型） | 16:9 |
| 时长 | 5s / 10s | 5s |
| 生成品质 | 标准(480p) / 高清(720p) / 超清(1080p) | 720p |
| 生成音频 | 开启 / 关闭 | 开启 |

### 积分估算

```javascript
let perVideo = 55
if (duration >= 10) perVideo *= 2       // 10s 翻倍
if (resolution === '1080p') perVideo *= 1.5  // 超清 ×1.5
if (resolution === '480p')  perVideo *= 0.7  // 标准 ×0.7
if (audio) perVideo *= 1.2              // 音频 ×1.2
totalCost = sceneCount * perVideo
```

切换模型时自动同步该模型的默认比例、时长和分辨率。

## 执行流程

### 1. 查找分镜图节点

通过 `script-output` 边找到分镜打组框的 `groupProxy` 节点，再从打组框的 `memberIds` 中筛选 `imageConfig` 类型节点。按画布位置（先行后列）排序。

### 2. 收集每个分镜的数据

```javascript
sceneData[i] = {
  imageUrl:  node.data.generatedUrls[mainImageIndex] || selectedUrl,
  prompt:    scene.videoMotionPrompt || scene.description,
  label:     `分镜视频 #${sceneNo}`
}
```

### 3. 创建视频打组框

- 位置：分镜打组框右侧 +80px
- 布局：5 列网格，每格 420×320 + 12px 间距
- 命名："视频组 · 分镜图 · 脚本生成器"
- 创建 `groupProxy` 节点并与分镜打组框的 proxy 连线

### 4. 并行视频生成

每个视频节点独立调用 `createVideoTaskOnly`，参数包含：

| 参数 | 来源 |
|------|------|
| `model` | 面板选择 |
| `prompt` | scene.videoMotionPrompt |
| `first_frame_image` | 当前分镜图的生成图 |
| `last_frame_image` | 下一个分镜图的生成图（最后一张仅有首帧） |
| `ratio` / `dur` / `resolution` | 面板选择 |

视频任务创建后，`VideoNode.vue` 内置的 `watch(taskId)` + `pollVideoTask` 会自动接管轮询，显示生成进度，直到获取到视频 URL 或报错。

每个任务完全独立——某个分镜视频失败不影响其他分镜的生成。

## 新增的状态变量

| 变量 | 类型 | 说明 |
|------|------|------|
| `showBatchVideoPanel` | `ref(boolean)` | 面板显示/隐藏 |
| `isGeneratingVideos` | `ref(boolean)` | 生成中状态 |
| `bvModel` | `ref(string)` | 选中的视频模型 |
| `bvRatio` | `ref(string)` | 视频比例 |
| `bvResolution` | `ref(string)` | 分辨率 |
| `bvDuration` | `ref(number)` | 时长（秒） |
| `bvAudio` | `ref(boolean)` | 是否生成音频 |

## 新增的 icon 导入

`VideocamOutline`, `VolumeHighOutline`, `VolumeMuteOutline`（来自 `@vicons/ionicons5`）

## CSS 命名

所有面板样式使用 `.bv-` 前缀（batch video），主要定义在 `Canvas.vue` 全局样式段。

## Vite 与 @ffmpeg/ffmpeg（开发态 HMR）

`@ffmpeg/ffmpeg` 内含 Web Worker，被 `optimizeDeps` 预打包后，worker 会错误指向 `node_modules/.vite/deps/worker.js` 等不存在路径。

**处理**：在 `vite.config.js` 中设置 `optimizeDeps.exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']`。若仍报错，删除 `node_modules/.vite` 后重新执行 `npm run dev`。
