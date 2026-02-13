# SSL 证书配置指南

本指南将帮助您为药物提醒系统配置 **Let's Encrypt 免费 SSL 证书**，实现 HTTPS 访问。

---

## 📋 前置要求

### 1. 域名准备

- ✅ 已注册域名（如 `example.com`）
- ✅ 域名 DNS 已解析到服务器 IP
- ✅ 可以通过域名访问服务器

**验证方法：**
```bash
# 在本地电脑执行
ping your-domain.com

# 应该能看到您的服务器 IP
```

### 2. 防火墙配置

确保以下端口已开放：

| 端口 | 协议 | 用途 |
|------|------|------|
| 80 | TCP | HTTP（Let's Encrypt 验证） |
| 443 | TCP | HTTPS |

**Ubuntu/Debian 防火墙配置：**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

**CentOS/RHEL 防火墙配置：**
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. Docker 环境

确保 Docker 和 Docker Compose 已安装并运行。

---

## 🚀 快速部署（推荐）

### 方法一：自动化脚本

```bash
# 1. 进入项目目录
cd /medicine_reminder/medicine-reminder-main

# 2. 拉取最新代码
git pull origin main

# 3. 运行 SSL 初始化脚本
./init-ssl.sh your-domain.com your-email@example.com

# 示例：
# ./init-ssl.sh medicine.example.com admin@example.com
```

**脚本会自动完成：**
- ✅ 更新 Nginx 配置中的域名
- ✅ 创建必要的目录结构
- ✅ 下载 SSL 配置文件
- ✅ 创建临时自签名证书
- ✅ 启动 Nginx 服务
- ✅ 申请 Let's Encrypt 证书
- ✅ 重启服务以启用 HTTPS

**执行时间：** 约 2-3 分钟

---

## 🔧 手动部署

如果自动化脚本失败，可以手动执行以下步骤：

### 步骤 1：更新 Nginx 配置

```bash
# 编辑 Nginx 配置文件
nano nginx/conf.d/app.conf

# 将所有 your-domain.com 替换为您的实际域名
# 保存并退出（Ctrl+O, Enter, Ctrl+X）
```

### 步骤 2：创建证书目录

```bash
mkdir -p certbot/conf certbot/www
```

### 步骤 3：下载 SSL 配置

```bash
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf

curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
```

### 步骤 4：创建临时证书

```bash
DOMAIN="your-domain.com"
mkdir -p "certbot/conf/live/$DOMAIN"

openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "certbot/conf/live/$DOMAIN/privkey.pem" \
    -out "certbot/conf/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=$DOMAIN"
```

### 步骤 5：启动服务

```bash
# 停止旧服务
docker-compose down

# 启动 SSL 版本
docker compose -f docker-compose.ssl.yml up -d
```

### 步骤 6：申请证书

```bash
docker compose -f docker-compose.ssl.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email \
    -d your-domain.com
```

### 步骤 7：重启 Nginx

```bash
docker compose -f docker-compose.ssl.yml restart nginx
```

---

## 🧪 测试 HTTPS

### 1. 浏览器访问

打开浏览器访问：
```
https://your-domain.com
```

应该能看到：
- ✅ 地址栏显示 🔒 锁图标
- ✅ 证书有效
- ✅ 正常显示登录页面

### 2. SSL 检测

使用在线工具检测 SSL 配置：
```
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

**期望评分：** A 或 A+

### 3. 检查证书信息

```bash
# 查看证书有效期
docker compose -f docker-compose.ssl.yml run --rm certbot certificates
```

---

## 🔄 证书续期

### 自动续期

Certbot 容器会**每 12 小时**自动检查证书是否需要续期。

Let's Encrypt 证书有效期为 **90 天**，Certbot 会在到期前 **30 天**自动续期。

### 手动续期

如需手动续期：

```bash
# 续期证书
docker compose -f docker-compose.ssl.yml run --rm certbot renew

# 重启 Nginx 加载新证书
docker compose -f docker-compose.ssl.yml restart nginx
```

### 测试续期流程

```bash
# 测试续期（不会真正续期）
docker compose -f docker-compose.ssl.yml run --rm certbot renew --dry-run
```

---

## 📁 文件结构

```
medicine-reminder/
├── nginx/
│   ├── nginx.conf              # Nginx 主配置
│   └── conf.d/
│       └── app.conf            # 应用站点配置
├── certbot/
│   ├── conf/                   # 证书存储目录
│   │   └── live/
│   │       └── your-domain.com/
│   │           ├── fullchain.pem
│   │           └── privkey.pem
│   └── www/                    # Let's Encrypt 验证目录
├── docker-compose.ssl.yml      # SSL 版本的 Docker Compose
└── init-ssl.sh                 # SSL 初始化脚本
```

---

## 🛠️ 常见问题

### 问题 1：证书申请失败

**错误信息：**
```
Challenge failed for domain your-domain.com
```

**可能原因：**
1. 域名 DNS 未正确解析
2. 防火墙未开放 80 端口
3. Nginx 配置错误

**解决方法：**
```bash
# 1. 检查 DNS 解析
nslookup your-domain.com

# 2. 检查端口
sudo netstat -tlnp | grep :80

# 3. 检查 Nginx 日志
docker compose -f docker-compose.ssl.yml logs nginx
```

### 问题 2：浏览器显示证书无效

**可能原因：**
- 使用了测试环境证书（staging）
- 证书未正确加载

**解决方法：**
```bash
# 删除测试证书
rm -rf certbot/conf/live certbot/conf/archive certbot/conf/renewal

# 重新申请正式证书
./init-ssl.sh your-domain.com your-email@example.com
```

### 问题 3：HTTP 无法访问

**现象：** 只能通过 HTTPS 访问，HTTP 无法访问

**说明：** 这是正常的！HTTP 请求会自动重定向到 HTTPS。

如需禁用重定向，编辑 `nginx/conf.d/app.conf`：
```nginx
# 注释掉重定向行
# return 301 https://$server_name$request_uri;

# 改为代理到应用
location / {
    proxy_pass http://app:3000;
    # ... 其他配置
}
```

### 问题 4：证书到期未自动续期

**检查 Certbot 容器状态：**
```bash
docker compose -f docker-compose.ssl.yml ps certbot
```

**查看 Certbot 日志：**
```bash
docker compose -f docker-compose.ssl.yml logs certbot
```

**手动强制续期：**
```bash
docker compose -f docker-compose.ssl.yml run --rm certbot renew --force-renewal
docker compose -f docker-compose.ssl.yml restart nginx
```

---

## 🔐 安全建议

### 1. 启用 HSTS

编辑 `nginx/conf.d/app.conf`，取消注释：
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 2. 定期备份证书

```bash
# 备份证书目录
tar -czf certbot-backup-$(date +%Y%m%d).tar.gz certbot/conf
```

### 3. 监控证书有效期

设置定时任务检查证书：
```bash
# 添加到 crontab
0 0 * * * docker compose -f /path/to/docker-compose.ssl.yml run --rm certbot certificates | mail -s "SSL Certificate Status" admin@example.com
```

---

## 📞 获取帮助

如遇到问题：

1. 查看日志：
   ```bash
   docker compose -f docker-compose.ssl.yml logs
   ```

2. 检查服务状态：
   ```bash
   docker compose -f docker-compose.ssl.yml ps
   ```

3. 提交 Issue：
   https://github.com/Kobevictor/medicine-reminder/issues

---

## 🎉 完成！

配置完成后，您的药物提醒系统将通过 HTTPS 安全访问：

- ✅ 数据传输加密
- ✅ 浏览器通知功能完全支持
- ✅ Cookie 安全性提升
- ✅ SEO 友好
- ✅ 符合现代 Web 安全标准

**访问地址：** https://your-domain.com
