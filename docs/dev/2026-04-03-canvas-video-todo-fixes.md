# 画布与分镜视频：待办四项（视口、Tab、选中、撤销快捷键）

## 背景与原因

1. 分镜视频节点展开时宽度从 400px 变为 460px，易被感知为「放大」或布局跳动。  
2. `ensureVideoGenDefaults` 在「无 model 的 videoGenParams」时用新对象整体覆盖，会丢掉已写入的 `first_frame_image`，`hasFirstFrameUrl` 变假，图生 Tab 被禁用；每次点击节点又调用补全，与 Tab 切换竞态。  
3. `onPaneClick` 在点到组外空白时只清 `selectedGroupId`，未清 Vue Flow 节点 `selected`，需多次点击才能退出单选/工具栏态。  
4. 撤销/重做仅侧栏按钮，需键盘与 `undo`/`redo` 一致。

## 修改点

- **VideoNode**：可展开分镜视频固定 `w-[460px]`；`ensureVideoGenDefaults` 合并旧 `videoGenParams` 保留首帧/尾帧等；`openVideoEdit` 仅在从折叠展开时调用补全；文生/图生 Tab 使用 `@click.stop`。  
- **Canvas**：`elevate-nodes-on-select` 设为 `false`，减轻选中时 z-index 抬升带来的突兀感；`onPaneClick` 组外分支 `map` 清除所有节点 `selected`；全局 `keydown` 合并处理 `Ctrl/Cmd+Z`、`Ctrl/Cmd+Shift+Z`、`Ctrl+Y`（输入/文本域聚焦时不处理），原打组 Delete/Backspace 逻辑并入同一处理器。

## 复盘

首帧丢失是图生切换失败的典型根因；pane 与节点选中需与 store 状态同步清理。
