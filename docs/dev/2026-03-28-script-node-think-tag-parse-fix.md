# 脚本生成器流式完成后报"请重试"修复

## 背景与原因

用户反馈：DeepSeek 已流式输出完毕，但脚本节点仍显示"生成失败，请重试"。

根因：`deepseek-chat`（v3）在 `delta.content` 中直接嵌入推理内容，格式为：

```
<think>
...大量推理文字，包含 [ 和 ] 字符...
</think>

[{"sceneNo":1,...},...]
```

`parseScriptJSON` 用 `/\[[\s\S]*\]/` 贪心正则定位 JSON 数组时，从 `<think>` 块内第一个 `[` 开始匹配，到最后一个 `]` 结束，结果包含了推理文字和 JSON 的混合体，`JSON.parse` 必然抛错 → catch 吞掉 → 返回 `null` → 抛出"解析分镜数据失败" → 节点变 error 状态。

（`deepseek-reasoner` 不受影响，因为推理链在 `delta.reasoning_content` 字段，`streamChatCompletions` 只读 `delta.content`，不会混入。）

## 修改点

`parseScriptJSON`（`ScriptNode.vue`）：在所有解析尝试之前，先用 `.replace(/<think>[\s\S]*?<\/think>/gi, '')` 剥离 `<think>...</think>` 块，再按原有顺序（裸数组 → 代码块 → 正则提取）解析。改动仅 1 行，影响范围极小。

## 复盘

系统提示词已要求"直接输出 JSON 数组，不要任何前置说明"，但 deepseek-chat v3 仍会在深度推理场景下注入 `<think>` 块。对 LLM 输出做容错解析时，应优先剥离已知的"噪音标签"再进行格式匹配，避免贪心正则被噪音锚点误导。

**涉及模块：** `src/components/nodes/ScriptNode.vue`
