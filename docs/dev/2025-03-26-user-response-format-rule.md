# 新增 Cursor 规则：助手最终回复格式与质量

**日期：** 2025-03-26

## 背景与原因

- 希望人机协作时，修复/交付后的说明 **结构统一**（原因、已做调整、用户侧操作等），并与 `docs/dev` 留档分工明确。

## 修改点

- `.cursor/rules/user-response-format.mdc` — `alwaysApply`，规定简体中文回复的推荐段落与质量要求。  
- `.Claude.md`、`docs/dev/README.md` — 增加对上述规则与 `dev-issue-log` 的索引。

## 复盘

- 规则与 `dev-issue-log` 并列：前者管「聊天怎么说」，后者管「仓库里记什么、怎么 commit」。
