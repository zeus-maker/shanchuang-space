# 对齐火山方舟图片/视频 API 路径与 Base URL 纠错

**日期：** 2025-03-26

## 背景与原因

- **生图 404：** 常见配置为 `VITE_VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com`（缺少 `/api/v3`），与代码拼接 `/images/generations` 后实际请求 `https://ark.../images/generations`，服务端返回 404。官方推理 Base 应为带 `/api/v3` 的前缀，见 [Base URL 及鉴权](https://www.volcengine.com/docs/82379/1298459)；图片接口见 [图片生成 API](https://www.volcengine.com/docs/82379/1541523)。
- **视频：** 方舟侧创建任务对应 OpenAPI **CreateContentsGenerationsTasks**，路径应为 `/api/v3/contents/generations/tasks`，查询为 `/api/v3/contents/generations/tasks/{task_id}`，与原先使用的 `/videos` 不一致，见 [创建视频生成任务](https://www.volcengine.com/docs/82379/1520757)、[查询视频生成任务](https://www.volcengine.com/docs/82379/1521309)。

## 修改点

- `src/config/volcengineEnv.js` — `normalizeVolcengineInferenceBase` 自动补全或截断到 `.../api/v3`；`getVolcengineImagePath` 支持 `VITE_VOLCENGINE_IMAGE_PATH` 覆盖默认 `/images/generations`。
- `src/hooks/useApi.js` — Seedream / Seedance 火山分支统一 `resolveVolcengineInferenceBase`；轮询结束条件改为「解析到视频 URL 或明确失败」，并识别 `output.video_url` 等字段。
- `src/config/providers.js` — `volcengine.endpoints.video` / `videoQuery` 改为 `contents/generations/tasks`；`responseAdapter.video` 补充 `output` 解析。
- `.env.example`、`README.md` — 说明 Base 写法与可选图片路径变量。

## 复盘

- 线上探活：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations` 无 Key 时为 401（路由存在），与「缺 api/v3 导致 404」现象一致。
- 若后续官方再变更路径，可通过 `VITE_VOLCENGINE_IMAGE_PATH` 或 `providers` 快速调整；任务状态枚举若扩展，需在 `pollVideoTask` 中补充。
