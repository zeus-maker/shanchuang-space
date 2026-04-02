# 分镜批量视频：首帧来源与提示词中/英切换

## 背景与原因

- 视频组图生视频希望镜头衔接更自然：首帧应对齐「上一分镜图」的成图，而不是本镜成图（第 1 镜仍用本镜图，无前镜可引）。
- 分镜视频节点上「复制提示词」与产品预期不符，应改为在同一节点内在中文说明与英文运动/分镜 prompt 之间切换编辑。

## 修改点

- **首帧规则**：`Canvas` / `ScriptNode` 批量创建与请求参数中，`first_frame_image` 使用 `resolveI2vFirstFrameFromStoryboardGroup`（上一 `imageConfig` 主图；若无则回退本镜）。尾帧仍用下一分镜主图。新建视频节点写入 `sceneNo` 便于与脚本行对齐。
- **工具**：`pickStoryboardImageUrlFromNode`、`resolveI2vFirstFrameFromStoryboardGroup` 等在 `storyboardVideoPrompt.js`；`findScriptScenesForGroup` 抽至 `storyboardGroupScenes.js` 供画布与 `VideoNode` 复用。
- **VideoNode**：图生首帧区可点击选择图片替换（DataURL 写入 `videoGenParams.first_frame_image`）；语言按钮改为 **中 / EN** 切换，持久化 `videoPromptLocale` 与 `videoMotionPromptZh` / `videoMotionPromptEn`（文生侧 `t2vPromptZh` / `t2vPromptEn`），并与脚本 `scenes` 解析出的中文描述 / 英文运动词互填（组内能连到脚本时）。

## 复盘

默认未存 `videoPromptLocale` 时 UI 按英文侧初始化，与批量写入的 `videoMotionPrompt` 习惯一致；若需默认中文可再改默认值。
