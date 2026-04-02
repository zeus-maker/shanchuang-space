# 视频节点：点击展开编辑（对齐文生图配置节点）

## 背景与原因

分镜视频节点此前将提示词与规格区常驻展示，节点体积大；产品与「文生图配置」节点交互不一致——后者为默认折叠、点击节点后展开编辑区，选中态与画布失配时收起。

## 修改点

- `VideoNode.vue` 增加 `selected` prop 与本地 `isExpanded`；具备 `videoGenParams` / `videoMotionPrompt` 的完成态节点默认仅显示预览与简短引导文案。
- 点击节点卡片（`@click.stop`）或节点被选中时展开完整编辑面板；取消选中约 80ms 后收起（与 `ImageConfigNode` 一致）。
- 无分镜元数据的普通视频节点行为不变；`videoGenParams` 消失时强制收起。

## 复盘

头部复制/删除区域增加 `@click.stop`，避免与节点级点击逻辑冲突；编辑区内 `@click.stop` / `@mousedown.stop` 减少误触画布失焦。
