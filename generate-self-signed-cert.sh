#!/bin/bash

# 自签名 SSL 证书生成脚本
# 用于开发和测试环境

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 自签名 SSL 证书生成工具 ===${NC}\n"

# 默认配置
DEFAULT_DOMAIN="localhost"
DEFAULT_DAYS=365
DEFAULT_COUNTRY="CN"
DEFAULT_STATE="Beijing"
DEFAULT_CITY="Beijing"
DEFAULT_ORG="Development"
DEFAULT_OU="IT Department"

# 获取域名
read -p "请输入域名 [默认: $DEFAULT_DOMAIN]: " DOMAIN
DOMAIN=${DOMAIN:-$DEFAULT_DOMAIN}

# 获取有效期
read -p "证书有效期（天）[默认: $DEFAULT_DAYS]: " DAYS
DAYS=${DAYS:-$DEFAULT_DAYS}

# 获取证书信息
echo -e "\n${YELLOW}证书信息（可直接回车使用默认值）：${NC}"
read -p "国家代码 (C) [默认: $DEFAULT_COUNTRY]: " COUNTRY
COUNTRY=${COUNTRY:-$DEFAULT_COUNTRY}

read -p "省份 (ST) [默认: $DEFAULT_STATE]: " STATE
STATE=${STATE:-$DEFAULT_STATE}

read -p "城市 (L) [默认: $DEFAULT_CITY]: " CITY
CITY=${CITY:-$DEFAULT_CITY}

read -p "组织名称 (O) [默认: $DEFAULT_ORG]: " ORG
ORG=${ORG:-$DEFAULT_ORG}

read -p "部门 (OU) [默认: $DEFAULT_OU]: " OU
OU=${OU:-$DEFAULT_OU}

# 显示配置摘要
echo -e "\n${GREEN}配置摘要：${NC}"
echo "  域名: $DOMAIN"
echo "  有效期: $DAYS 天"
echo "  国家: $COUNTRY"
echo "  省份: $STATE"
echo "  城市: $CITY"
echo "  组织: $ORG"
echo "  部门: $OU"
echo ""

# 确认
read -p "确认生成证书？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}已取消${NC}"
    exit 1
fi

# 创建证书目录
CERT_DIR="ssl-certs"
mkdir -p "$CERT_DIR"

echo -e "\n${GREEN}1. 生成私钥...${NC}"
openssl genrsa -out "$CERT_DIR/privkey.pem" 2048
echo -e "${GREEN}   ✓ 私钥已生成: $CERT_DIR/privkey.pem${NC}"

echo -e "\n${GREEN}2. 生成证书签名请求 (CSR)...${NC}"
openssl req -new \
    -key "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/cert.csr" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$DOMAIN"
echo -e "${GREEN}   ✓ CSR 已生成: $CERT_DIR/cert.csr${NC}"

echo -e "\n${GREEN}3. 创建扩展配置文件...${NC}"
cat > "$CERT_DIR/cert.ext" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
echo -e "${GREEN}   ✓ 扩展配置已创建: $CERT_DIR/cert.ext${NC}"

echo -e "\n${GREEN}4. 生成自签名证书...${NC}"
openssl x509 -req \
    -in "$CERT_DIR/cert.csr" \
    -signkey "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -days $DAYS \
    -sha256 \
    -extfile "$CERT_DIR/cert.ext"
echo -e "${GREEN}   ✓ 证书已生成: $CERT_DIR/fullchain.pem${NC}"

# 生成 PFX 格式（可选，用于 Windows）
echo -e "\n${GREEN}5. 生成 PFX 格式证书（可选）...${NC}"
openssl pkcs12 -export \
    -out "$CERT_DIR/certificate.pfx" \
    -inkey "$CERT_DIR/privkey.pem" \
    -in "$CERT_DIR/fullchain.pem" \
    -passout pass:
echo -e "${GREEN}   ✓ PFX 证书已生成: $CERT_DIR/certificate.pfx${NC}"

# 查看证书信息
echo -e "\n${GREEN}6. 证书信息：${NC}"
openssl x509 -in "$CERT_DIR/fullchain.pem" -text -noout | grep -A 2 "Validity"
openssl x509 -in "$CERT_DIR/fullchain.pem" -text -noout | grep "Subject:"
openssl x509 -in "$CERT_DIR/fullchain.pem" -text -noout | grep -A 1 "Subject Alternative Name"

# 生成证书指纹（用于信任）
echo -e "\n${GREEN}7. 证书指纹（SHA256）：${NC}"
openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -fingerprint -sha256

# 清理临时文件
rm -f "$CERT_DIR/cert.csr" "$CERT_DIR/cert.ext"

# 完成
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 自签名证书生成完成！${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}生成的文件：${NC}"
echo "  📄 私钥: $CERT_DIR/privkey.pem"
echo "  📄 证书: $CERT_DIR/fullchain.pem"
echo "  📄 PFX: $CERT_DIR/certificate.pfx"

echo -e "\n${YELLOW}使用方法：${NC}"
echo "  1. 将证书文件复制到 Nginx 配置目录"
echo "  2. 更新 docker-compose.dev-ssl.yml"
echo "  3. 启动服务: docker compose -f docker-compose.dev-ssl.yml up -d"

echo -e "\n${YELLOW}信任证书（消除浏览器警告）：${NC}"
echo "  📖 查看详细说明: SELF_SIGNED_SSL_GUIDE.md"

echo -e "\n${RED}⚠️  注意：${NC}"
echo "  - 自签名证书仅用于开发和测试"
echo "  - 浏览器会显示"不安全"警告（需手动信任）"
echo "  - 生产环境请使用 Let's Encrypt 证书"
echo ""
