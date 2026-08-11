#!/bin/sh
set -e

# 默认后端地址
BACKEND_URL="${BACKEND_URL:-127.0.0.1:9000}"

# 去掉用户误加的 http:// 或 https:// 前缀（nginx.conf 模板中已包含 http:// 前缀）
BACKEND_URL=$(echo "$BACKEND_URL" | sed 's|^https\?://||')

echo "============================================"
echo " pipeline-frontend 启动"
echo " 后端服务地址: http://${BACKEND_URL}"
echo "============================================"

# 将 nginx 配置模板中的占位符替换为实际后端地址，输出到正式配置路径
sed "s|__BACKEND_URL__|${BACKEND_URL}|g" \
    /etc/nginx/conf.d/default.conf.template \
    > /etc/nginx/conf.d/default.conf

# 执行传入的命令（默认 nginx）
exec "$@"
