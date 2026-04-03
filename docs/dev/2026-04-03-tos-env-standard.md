# 火山 TOS 环境变量：对齐 TOS_* 与对象前缀

## 背景与原因

团队其它服务已采用 **`TOS_ACCESS_KEY` / `TOS_SECRET_KEY` / `TOS_BUCKET` / `TOS_REGION` / `TOS_ENDPOINT`** 及 **`TOS_OBJECT_PREFIX`** 五项（加前缀）配置对象存储。媒体服务原先仅识别 **`VOLCENGINE_TOS_*`**，与现有运维习惯不一致，且无法在桶内统一业务前缀。

## 修改点

- **`server/index.mjs`**：`getTosRuntime` **优先读取 `TOS_*`**，缺省再回退 **`VOLCENGINE_TOS_*`**；`TOS_ENDPOINT` 支持带 **`https://`**；新增 **`TOS_OBJECT_PREFIX`**（及兼容 **`VOLCENGINE_TOS_OBJECT_PREFIX`**），对象键为 **`{prefix}/sora-i2v-frames/{projectId}/{uuid}.ext`**，无前缀时与旧行为一致。
- **`buildTosPublicObjectUrl`**：自定义公网前缀支持 **`TOS_PUBLIC_BASE_URL`**，并保留 **`VOLCENGINE_TOS_PUBLIC_BASE_URL`**。
- **README**、**`.env.example`**：以 `TOS_*` 为主表，旧变量标为兼容。

## 复盘

- 密钥、桶名仅通过环境变量注入，**不得**写入仓库与留档正文。
- **涉及模块**：`server/index.mjs`、`README.md`、`.env.example`。
