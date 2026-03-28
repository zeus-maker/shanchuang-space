# 脚本生成器"生成失败"排查全过程

## 背景与原因

用户反馈：DeepSeek 流式输出完毕（收到 `[DONE]`）后，脚本节点仍显示"生成失败，请重试"。排查过程经历三个阶段，最终定位到根因。

---

### 阶段一：误判为 `<think>` 标签干扰

**现象推断**：`deepseek-chat` v3 会把推理内容以 `<think>...</think>` 嵌入 `delta.content`，块内含大量 `[` `]`，原来的贪心正则 `\[[\s\S]*\]` 从推理块里的第一个 `[` 开始匹配，导致截取出含推理文字的非法 JSON，`JSON.parse` 失败。

**修改**：`parseScriptJSON` 解析前先 strip `<think>...</think>` 块。

**结论**：此修改有益但未解决用户当下的问题。

---

### 阶段二：用户确认根因方向

用户提示"有没有可能是生成时没清除上次错误的保存内容"，并贴出控制台日志：

```
[ScriptNode] 生成失败: Error 解析分镜数据失败，请重试
fullText前200字符: [
  {
    "sceneNo": 1,
    ...
    "characterImg1": "A tired
```

关键信息：`fullText` 已经是正确的 JSON 数组，且开头合法。

---

### 阶段三：定位真实根因

**根因**：LLM 在 `storyboardPrompt`、`videoMotionPrompt`、`characterImg1` 等英文描述字段中直接输出了**裸换行符**（raw newline），形如：

```
"characterImg1": "A tired
28-year-old woman, pale face..."
```

JSON 规范要求字符串内换行必须转义为 `\n`，裸换行字符是非法的，`JSON.parse` 直接抛异常。

---

## 修改点

### `src/components/nodes/ScriptNode.vue`

1. **`parseScriptJSON` 增加 JSON 修复步骤**：第一次 `JSON.parse` 失败后，用正则把所有 JSON 字符串值内的裸 `\n` `\r` `\t` 替换为转义形式后再解析：
   ```js
   .replace(/"((?:[^"\\]|\\.)*)"/gs, (_, inner) =>
     '"' + inner.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"'
   )
   ```
   同时移除末尾多余逗号（`trailing comma`）。

2. **同步强化 `parseScriptJSON` 的其他策略**：保留 `<think>` 剥离、括号深度计数提取（替代贪心正则）、兼容 `{"scenes":[...]}` 包装对象格式。

3. **生成开始前完整重置状态**：调用 `abortCtrl?.abort()` 中止上一次未完成请求（防并发），并显式重置 `scenes`、`taskId`、`errorMsg` 等所有脚本字段，避免 `updateNode` 浅合并下旧字段残留。

4. **catch 块加 `console.error`**：输出 `err.name`、`err.message` 和 `fullText` 前 200 字符，便于后续排查定位。

### `src/components/nodes/ImageConfigNode.vue`（同期修复）

- 新增可编辑 `localPrompt` 绑定 textarea，初始值来自 `data.prompt`（分镜生成器预填提示词可见可改）
- `getConnectedInputs()` 末尾加 fallback：无连接时使用 `localPrompt` 作为提示词，修复"整组执行无反应"（原因：节点无连接时 `handleGenerate` 提前 return 不 resolve，Promise 挂死）

## 复盘

- LLM 输出的 JSON 中裸换行是高频问题，解析层必须做容错修复，不能假设模型严格遵守 JSON 规范。
- 调试时应第一时间打印 `fullText` 到控制台，而不是仅靠错误信息猜测原因。
- `parseScriptJSON` 现采用"先尝试直接解析→修复后再解析→多格式兜底"的分层策略，健壮性大幅提升。

**涉及模块：** `src/components/nodes/ScriptNode.vue`、`src/components/nodes/ImageConfigNode.vue`
