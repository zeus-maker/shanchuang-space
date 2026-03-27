# 新增 Cursor 规则：助手最终回复格式与质量

**日期：** 2025-03-26

## 背景与原因

- 希望人机协作时，修复/交付后的说明 **结构统一**（原因、已做调整、用户侧操作等），并与 `docs/dev` 留档分工明确。

## 修改点

- ~~`.cursor/rules/user-response-format.mdc`~~ / ~~`dev-issue-log.mdc`~~ 已合并为 **`.cursor/rules/dev-delivery-zh.mdc`**（`alwaysApply`：回复格式 + `docs/dev` 与 commit）。  
- `.Claude.md`、`docs/dev/README.md` — 索引指向合并后的规则文件。

## 复盘

- 单文件维护「聊天怎么说」与「仓库里记什么、怎么 commit」，减少重复与引用分叉。
