# 视频节点：点击展开编辑（对齐文生图配置节点）

## 背景与原因

分镜视频节点此前将提示词与规格区常驻展示，节点体积大；产品与「文生图配置」节点交互不一致——后者为默认折叠、点击节点后展开编辑区，选中态与画布失配时收起。

## 修改点

- `VideoNode.vue` 增加 `selected` prop 与本地 `isExpanded`；**任意**已有成片地址且非加载/错误/任务中的节点均可展开（不再要求先有 `videoGenParams`）。
- 首次展开时 `ensureVideoGenDefaults()`：若无 `videoGenParams` 则按当前 `data.model` 与模型配置写入默认比例/时长/分辨率/配音，并补 `videoMotionPrompt` 空串。
- 折叠态在 `<video>` 上覆盖透明 `button`，避免原生 controls 吞掉点击导致无法展开。
- 点击节点卡片（`openVideoEdit`）或节点被选中时展开；取消选中约 80ms 后收起（与 `ImageConfigNode` 一致）。

## 复盘

头部复制/删除区域增加 `@click.stop`；编辑区内 `@click.stop` / `@mousedown.stop` 减少误触画布失焦。轮询完成写回节点时若未带 `videoGenParams`，旧逻辑会把整段编辑区判为不可用，已消除。
