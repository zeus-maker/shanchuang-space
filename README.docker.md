# 闪创空间 · Docker 部署说明

镜像内由 **Node** 同时提供：

- 静态前端：`/shanchuang-space/`
- 本地媒体 API：`/api/media/*`

默认监听 **80** 端口，媒体文件目录 **`/app/uploads`**（建议挂载数据卷）。

## 快速运行

```bash
docker build -t shanchuang-space:latest .
docker run -d -p 8080:80 --name shanchuang-space \
  -v "$(pwd)/uploads:/app/uploads" \
  shanchuang-space:latest
```

浏览器访问：**`http://localhost:8080/shanchuang-space/`**

## 常用命令

```bash
docker stop shanchuang-space
docker start shanchuang-space
docker rm shanchuang-space
docker logs -f shanchuang-space
docker exec -it shanchuang-space sh
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 容器内监听端口，默认 `80` |
| `MEDIA_ROOT` | 媒体存储目录，默认 `/app/uploads` |
| `SERVE_STATIC` | 是否托管 `dist`，镜像内已默认开启 |

## 仅 Nginx 反代静态 + 分离 Node

若静态资源由 Nginx 提供、媒体服务单独跑 Node，请参考仓库根目录 **`nginx.conf`** 中 **`/shanchuang-space`** 与 **`/api/media/`** 的示例；并确保前端构建的 `base` 仍为 **`/shanchuang-space`**。

## 发布镜像（示例）

```bash
docker build -t <你的注册表>/shanchuang-space:latest .
docker push <你的注册表>/shanchuang-space:latest
```

## 说明

- 访问应用时必须带路径前缀 **`/shanchuang-space/`**（与 `vite.config.js` 的 `base` 一致）。  
- 对外暴露的 AI 网关（如 `/v1`）需在网关或 Nginx 上单独配置；本镜像仅包含前端与本地媒体服务。
