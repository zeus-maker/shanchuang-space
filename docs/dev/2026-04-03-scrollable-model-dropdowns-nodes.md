# 脚本 / 视频 / 文生图 / LLM 节点：模型下拉可滚动

## 背景与原因

星图等渠道下视频、聊天模型条目很多，`n-dropdown` 默认菜单高度不足时，底部模型无法点选。画布「整组执行」分镜图面板此前已加 `scrollable` + `max-height`，节点侧未统一。

## 修改点

- 新增 **`src/utils/scrollableModelDropdown.js`**：`scrollableModelDropdownMenuProps()`（供 `n-dropdown`）、`scrollableModelSelectMenuProps`（供 `n-select`），菜单高度 `min(360px, 55vh)`。
- **脚本节点** `ScriptNode.vue`：生成分镜用聊天模型、批量生成视频用视频模型下拉均加 `scrollable` + `menu-props`。
- **视频配置 / 视频节点** `VideoConfigNode.vue`、`VideoNode.vue`：模型选择下拉同上。
- **文生图节点** `ImageConfigNode.vue`：模型下拉同上。
- **LLM 配置节点** `LLMConfigNode.vue`：模型 `n-select` 增加 `menu-props` 限制下拉高度。
- **画布** `Canvas.vue`：批量视频模型下拉与整组生图模型下拉复用同一工具函数，去掉重复内联定义。

## 复盘

- 比例、时长等选项较少的下拉未改，避免无意义滚动条。

**涉及模块**：`src/utils/scrollableModelDropdown.js`、`ScriptNode.vue`、`VideoConfigNode.vue`、`VideoNode.vue`、`ImageConfigNode.vue`、`LLMConfigNode.vue`、`Canvas.vue`
