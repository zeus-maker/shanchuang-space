# 图片节点默认 Seedream、视频节点默认 Seedance 1.5 Pro

## 背景与原因

用户期望新建图片配置节点时默认选中 Seedream（`doubao-seedream-4-5-251128`），新建视频配置节点时默认选中 Seedance 1.5 Pro（`doubao-seedance-1-5-pro-251215`）。

视频节点已经正确：`DEFAULT_VIDEO_MODEL` 本身就是 seedance 1.5 pro。

图片节点存在两层问题：
1. `DEFAULT_IMAGE_MODEL`（`config/models.js`）一直是 `'nano-banana-pro'`，Pinia store 的 `selectedImageModel` 初始值从此读取，导致"模型不可用时的 onMounted 回落"指向 nano-banana-pro 而非 seedream。
2. 上一次 sprint 虽在 `getDefaultNodeData` 里用 `SEEDREAM_KEY` 常量优先选 seedream，但 `DEFAULT_IMAGE_MODEL` 未同步更新，导致 store 层与节点初始化层不一致。

## 修改点

- `src/config/models.js`：`DEFAULT_IMAGE_MODEL` 从 `'nano-banana-pro'` 改为 `'doubao-seedream-4-5-251128'`，保证 Pinia store 的 `selectedImageModel` 初始值、`onMounted` 回落值全部指向 seedream。
- `src/stores/canvas.js`：`getDefaultNodeData` 的 `imageConfig` case 去掉多余的 `SEEDREAM_KEY` 常量，直接使用 `DEFAULT_IMAGE_MODEL`，保持与 config 层一致。
- `DEFAULT_VIDEO_MODEL` 已经是 seedance 1.5 pro，无需修改。

## 复盘

`DEFAULT_IMAGE_MODEL` 是系统性的默认值锚点，应当与产品侧的"主推模型"保持同步。历史上它指向 nano-banana-pro 是因为当时 seedream 尚未上线；此次一并修正，避免后续再出现 config 与初始化逻辑不一致的问题。

**涉及模块：** `src/config/models.js`、`src/stores/canvas.js`
