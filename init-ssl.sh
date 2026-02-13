#!/bin/bash

# SSL 证书初始化脚本
# 使用 Let's Encrypt 免费证书

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SSL 证书初始化脚本 ===${NC}\n"

# 检查是否提供域名
if [ -z "$1" ]; then
    echo -e "${RED}错误：请提供域名${NC}"
    echo "用法: ./init-ssl.sh your-domain.com your-email@example.com"
    echo "示例: ./init-ssl.sh example.com admin@example.com"
    exit 1
fi

if [ -z "$2" ]; then
    echo -e "${RED}错误：请提供邮箱地址${NC}"
    echo "用法: ./init-ssl.sh your-domain.com your-email@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2
STAGING=${3:-0} # 默认使用正式环境，设置为1使用测试环境

echo -e "${YELLOW}域名：${NC}$DOMAIN"
echo -e "${YELLOW}邮箱：${NC}$EMAIL"
if [ "$STAGING" = "1" ]; then
    echo -e "${YELLOW}模式：${NC}测试环境（不会生成真实证书）"
else
    echo -e "${YELLOW}模式：${NC}正式环境"
fi
echo ""

# 确认继续
read -p "确认以上信息正确？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}已取消${NC}"
    exit 1
fi

# 更新 Nginx 配置中的域名
echo -e "\n${GREEN}1. 更新 Nginx 配置...${NC}"
sed -i "s/your-domain.com/$DOMAIN/g" nginx/conf.d/app.conf
echo -e "${GREEN}   ✓ 域名已更新为: $DOMAIN${NC}"

# 创建必要的目录
echo -e "\n${GREEN}2. 创建证书目录...${NC}"
mkdir -p certbot/conf certbot/www
echo -e "${GREEN}   ✓ 目录已创建${NC}"

# 下载推荐的 SSL 配置
echo -e "\n${GREEN}3. 下载 SSL 配置文件...${NC}"
if [ ! -f "certbot/conf/options-ssl-nginx.conf" ]; then
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
    echo -e "${GREEN}   ✓ options-ssl-nginx.conf 已下载${NC}"
fi
if [ ! -f "certbot/conf/ssl-dhparams.pem" ]; then
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
    echo -e "${GREEN}   ✓ ssl-dhparams.pem 已下载${NC}"
fi

# 创建临时自签名证书（用于首次启动 Nginx）
echo -e "\n${GREEN}4. 创建临时自签名证书...${NC}"
CERT_PATH="certbot/conf/live/$DOMAIN"
mkdir -p "$CERT_PATH"

if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$CERT_PATH/privkey.pem" \
        -out "$CERT_PATH/fullchain.pem" \
        -subj "/CN=$DOMAIN" 2>/dev/null
    echo -e "${GREEN}   ✓ 临时证书已创建${NC}"
else
    echo -e "${YELLOW}   ⚠ 证书已存在，跳过${NC}"
fi

# 启动 Nginx（仅 HTTP，用于验证）
echo -e "\n${GREEN}5. 启动 Nginx（HTTP 模式）...${NC}"
docker compose -f docker-compose.ssl.yml up -d nginx
sleep 3
echo -e "${GREEN}   ✓ Nginx 已启动${NC}"

# 申请 Let's Encrypt 证书
echo -e "\n${GREEN}6. 申请 SSL 证书...${NC}"
STAGING_ARG=""
if [ "$STAGING" = "1" ]; then
    STAGING_ARG="--staging"
    echo -e "${YELLOW}   使用测试环境（不会生成真实证书）${NC}"
fi

docker compose -f docker-compose.ssl.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_ARG \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✓ SSL 证书申请成功！${NC}"
else
    echo -e "${RED}   ✗ SSL 证书申请失败${NC}"
    echo -e "${YELLOW}   请检查：${NC}"
    echo -e "   1. 域名 DNS 是否正确解析到本服务器"
    echo -e "   2. 防火墙是否开放 80 和 443 端口"
    echo -e "   3. 域名是否可以从公网访问"
    exit 1
fi

# 重启 Nginx 以加载真实证书
echo -e "\n${GREEN}7. 重启 Nginx（HTTPS 模式）...${NC}"
docker compose -f docker-compose.ssl.yml restart nginx
sleep 2
echo -e "${GREEN}   ✓ Nginx 已重启${NC}"

# 完成
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ SSL 证书配置完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n访问地址："
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo -e "\n证书自动续期："
echo -e "  Certbot 容器会每 12 小时检查一次证书"
echo -e "  证书到期前会自动续期"
echo -e "\n手动续期命令："
echo -e "  ${YELLOW}docker compose -f docker-compose.ssl.yml run --rm certbot renew${NC}"
echo ""
