# 多阶段：构建静态资源 + 单进程 Node 托管前端与 /api/media 本地缓存
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV SERVE_STATIC=true
ENV PORT=80
ENV MEDIA_ROOT=/app/uploads
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
RUN mkdir -p /app/uploads
EXPOSE 80
CMD ["node", "server/index.mjs"]
