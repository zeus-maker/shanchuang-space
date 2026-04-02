# 脚本节点：按目标时长拆镜数 + JSON 解析与 LLM 修复

**日期**: 2026-04-02

## 背景与原因

1. 分镜系统提示固定「12–20 镜」，与用户要求的总时长（如 30 秒成片）脱节；期望按约 **5 秒/镜** 估算镜数（30 秒 → 6 镜）。  
2. 流式输出偶发夹杂说明文字、未转义换行、代码块等，导致 `JSON.parse` 失败并提示「解析分镜数据失败」。

## 修改点

- 新增 **`src/utils/scriptStoryboard.js`**：`inferTargetSecondsForStoryboard`（识别 `**时长建议**`、范围秒数、`N秒分镜`、分钟等）、`computeStoryboardSceneCount`（`总秒数/5`，限制 3–60）、`buildStoryboardSystemPrompt`（有目标时长时要求**恰好 N 镜**且 duration 之和贴近总时长；无则 12–18 镜）、`parseScriptJSON`（BOM/弯引号/前缀截断、`redacted_thinking` 与 `redacted_thinking` 剥离、代码块与括号提取等）、`repairStoryboardJsonViaLlm`（非流式二次请求，仅输出合法 JSON）。  
- **`ScriptNode.vue`**：生成分镜前根据 `buildUserMessage()` 全文推断时长并生成动态 system prompt；流式结束后先 `parseScriptJSON`，失败则调用修复接口再解析。

## 复盘

修复请求再走一次 chat 补全，会产生额外 token；若仍失败，用户可重试或换模型。时长推断依赖中文/常见格式，极端写法可能回落到默认 12–18 镜。

**涉及模块**：`src/utils/scriptStoryboard.js`、`src/components/nodes/ScriptNode.vue`、`docs/todo/1-需求修改点.md`
