#!/bin/bash
set -e

echo "=== 服务器初始化脚本 ==="

if [ "$EUID" -ne 0 ]; then
  echo "请使用 root 权限运行: sudo bash setup-server.sh"
  exit 1
fi

echo ""
echo "1. 更新系统包..."
apt-get update -y

echo ""
echo "2. 安装 Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

echo ""
echo "3. 安装 Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo ""
echo "4. 安装 PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

echo ""
echo "5. 创建应用目录..."
mkdir -p /var/www/mulan

echo ""
echo "=== 初始化完成 ==="
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"
echo "Nginx 状态: $(systemctl is-active nginx)"
echo ""
