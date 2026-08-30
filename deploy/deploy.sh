#!/bin/bash
set -e

REMOTE_HOST="$1"
REMOTE_USER="${2:-root}"
SSH_KEY="${3:-~/.ssh/id_rsa}"

if [ -z "$REMOTE_HOST" ]; then
  echo "用法: ./deploy.sh <服务器IP> [用户名] [SSH密钥路径]"
  echo "示例: ./deploy.sh 8.8.8.8 root ~/.ssh/id_rsa"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR="/var/www/mulan"

echo "=== 部署到 $REMOTE_USER@$REMOTE_HOST ==="

echo ""
echo "1. 本地构建..."
cd "$PROJECT_DIR"
npm run build

echo ""
echo "2. 上传文件到服务器..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_DIR"

scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
  "$PROJECT_DIR/dist" \
  "$PROJECT_DIR/server-http.js" \
  "$PROJECT_DIR/package.json" \
  "$PROJECT_DIR/package-lock.json" \
  "$PROJECT_DIR/deploy/ecosystem.config.js" \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo ""
echo "3. 安装后端依赖..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && npm install --production"

echo ""
echo "4. 配置 Nginx..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  "$PROJECT_DIR/deploy/nginx.conf" \
  "$REMOTE_USER@$REMOTE_HOST:/etc/nginx/sites-available/mulan"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "
  ln -sf /etc/nginx/sites-available/mulan /etc/nginx/sites-enabled/mulan
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
"

echo ""
echo "5. 启动/重启后端服务..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "
  cd $REMOTE_DIR
  pm2 delete mulan-server 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
"

echo ""
echo "=== 部署完成 ==="
echo "访问地址: http://$REMOTE_HOST"
echo ""
