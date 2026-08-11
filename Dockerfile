# ============================================================
# 多阶段构建：Node.js 编译 → Nginx 运行
# ============================================================

# ---- 第一阶段：构建前端产物 ----
FROM node:22-alpine AS builder

WORKDIR /app

# 先复制 package.json，利用 Docker 层缓存
COPY package.json package-lock.json* ./

RUN npm ci

# 复制源码并构建
COPY . .

RUN npm run build

# ---- 第二阶段：Nginx 运行 ----
FROM nginx:alpine

# 复制构建产物到 Nginx 静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置模板和启动脚本
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

# 使用自定义启动脚本（支持运行时注入 BACKEND_URL）
ENTRYPOINT ["/docker-entrypoint.sh"]

# 启动 Nginx（前台运行，保持容器不退出）
CMD ["nginx", "-g", "daemon off;"]
