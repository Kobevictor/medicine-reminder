# 药物提醒系统 - Docker 部署指南

本文档提供了使用 Docker 和 Docker Compose 部署药物提醒系统的完整指南。

## 系统要求

### 硬件要求
- CPU: 2核心或以上
- 内存: 2GB RAM 或以上
- 磁盘空间: 至少 5GB 可用空间

### 软件要求
- Docker: 20.10.0 或更高版本
- Docker Compose: 2.0.0 或更高版本
- 操作系统: Linux / macOS / Windows (with WSL2)

## 安装 Docker 和 Docker Compose

### Linux (Ubuntu/Debian)

```bash
# 更新软件包索引
sudo apt-get update

# 安装必要的依赖
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 添加 Docker 官方 GPG 密钥
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置 Docker 仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

### macOS

```bash
# 使用 Homebrew 安装
brew install --cask docker

# 或者直接下载 Docker Desktop for Mac
# https://www.docker.com/products/docker-desktop
```

### Windows

下载并安装 Docker Desktop for Windows:
https://www.docker.com/products/docker-desktop

## 配置环境变量

1. 复制示例配置文件：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，修改以下配置：

```env
# 数据库配置
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_DATABASE=medicine_reminder
MYSQL_USER=medicine_user
MYSQL_PASSWORD=your_secure_database_password

# JWT 密钥（务必修改为随机字符串）
JWT_SECRET=your_very_long_and_random_secret_key_here

# 服务器端口
PORT=3000

# 运行环境
NODE_ENV=production
```

**重要提示：**
- 务必修改 `JWT_SECRET` 为一个长且随机的字符串
- 修改所有默认密码以确保安全性
- 不要将 `.env` 文件提交到版本控制系统

## 部署步骤

### 1. 克隆项目（如果还没有）

```bash
git clone https://github.com/Kobevictor/medicine-reminder.git
cd medicine-reminder
```

### 2. 构建并启动容器

```bash
# 构建并启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f
```

### 3. 初始化数据库

首次部署时，需要运行数据库迁移：

```bash
# 进入应用容器
docker compose exec app sh

# 运行数据库迁移
pnpm run db:push

# 退出容器
exit
```

### 4. 访问应用

打开浏览器访问：http://localhost:3000

## 常用命令

### 查看运行状态

```bash
docker compose ps
```

### 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f app
docker compose logs -f db
```

### 停止服务

```bash
docker compose stop
```

### 启动服务

```bash
docker compose start
```

### 重启服务

```bash
docker compose restart
```

### 停止并删除容器

```bash
docker compose down
```

### 停止并删除容器及数据卷

```bash
# 警告：这将删除所有数据！
docker compose down -v
```

### 重新构建镜像

```bash
docker compose build --no-cache
docker compose up -d
```

## 数据备份

### 备份数据库

```bash
# 创建备份目录
mkdir -p backups

# 备份数据库
docker compose exec db mysqldump \
  -u root \
  -p${MYSQL_ROOT_PASSWORD} \
  ${MYSQL_DATABASE} > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 恢复数据库

```bash
# 恢复数据库
docker compose exec -T db mysql \
  -u root \
  -p${MYSQL_ROOT_PASSWORD} \
  ${MYSQL_DATABASE} < backups/backup_20240101_120000.sql
```

## 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker compose build
docker compose up -d

# 运行数据库迁移（如有需要）
docker compose exec app pnpm run db:push
```

## 生产环境配置建议

### 1. 使用反向代理（Nginx）

创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 启用 HTTPS

使用 Let's Encrypt 获取免费 SSL 证书：

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. 配置防火墙

```bash
# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 禁止直接访问应用端口
sudo ufw deny 3000/tcp

# 启用防火墙
sudo ufw enable
```

### 4. 设置自动备份

创建备份脚本 `backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份数据库
docker compose exec -T db mysqldump \
  -u root \
  -p${MYSQL_ROOT_PASSWORD} \
  ${MYSQL_DATABASE} > ${BACKUP_DIR}/backup_${DATE}.sql

# 压缩备份
gzip ${BACKUP_DIR}/backup_${DATE}.sql

# 删除30天前的备份
find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +30 -delete
```

添加到 crontab：

```bash
# 每天凌晨2点执行备份
0 2 * * * /path/to/backup.sh
```

## 故障排查

### 应用无法启动

```bash
# 查看详细日志
docker compose logs app

# 检查环境变量
docker compose exec app env | grep DATABASE_URL
```

### 数据库连接失败

```bash
# 检查数据库是否运行
docker compose ps db

# 检查数据库日志
docker compose logs db

# 测试数据库连接
docker compose exec db mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SHOW DATABASES;"
```

### 端口冲突

如果端口 3000 或 3306 已被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "8080:3000"  # 将应用映射到 8080 端口
```

## 性能优化

### 1. 调整 MySQL 配置

创建 `mysql.cnf`：

```ini
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
```

在 `docker-compose.yml` 中挂载配置：

```yaml
db:
  volumes:
    - ./mysql.cnf:/etc/mysql/conf.d/custom.cnf
```

### 2. 限制容器资源

在 `docker-compose.yml` 中添加资源限制：

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

## 安全建议

1. **定期更新**：保持 Docker 和应用程序更新到最新版本
2. **强密码**：使用强密码并定期更换
3. **网络隔离**：使用 Docker 网络隔离服务
4. **最小权限**：不要以 root 用户运行应用
5. **日志监控**：定期检查日志文件，发现异常行为
6. **备份策略**：建立定期备份机制，并测试恢复流程

## 支持与帮助

如遇到问题，请：

1. 查看日志文件：`docker compose logs -f`
2. 检查 GitHub Issues：https://github.com/Kobevictor/medicine-reminder/issues
3. 提交新的 Issue 描述您的问题

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。
