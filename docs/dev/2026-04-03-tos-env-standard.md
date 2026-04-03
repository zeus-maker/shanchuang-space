# 火山 TOS 环境变量：统一 VOLCENGINE_TOS_*

## 背景与原因

Sora 首帧上传需读项目根 **`.env`**。曾并行支持 **`TOS_*`** 与 **`VOLCENGINE_TOS_*`**，与仓库既有「火山」前缀命名不一致；按产品要求**只保留 `VOLCENGINE_TOS_*`**，避免两套配置并存。

## 修改点

- **`server/index.mjs`**：`getTosRuntime` / **`buildTosPublicObjectUrl`** 仅读取 **`VOLCENGINE_TOS_*`**（含 **`VOLCENGINE_TOS_OBJECT_PREFIX`**、**`VOLCENGINE_TOS_ENDPOINT`** 可带 `https://`）。
- **`.env` / `.env.example` / README**：示例与说明表仅列 **`VOLCENGINE_TOS_*`**。

## 复盘

- 密钥勿入库；媒体服务仍用 **dotenv** 加载根目录 `.env`。
- **涉及模块**：`server/index.mjs`、`README.md`、`.env.example`。
