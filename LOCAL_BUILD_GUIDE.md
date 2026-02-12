# 本地构建运行指南

本文档详细说明如何在本地环境构建和运行药物提醒系统，无需 Docker。

---

## 📋 目录

- [环境准备](#环境准备)
- [方式一：开发模式运行](#方式一开发模式运行)
- [方式二：生产模式构建](#方式二生产模式构建)
- [数据库配置](#数据库配置)
- [常见问题](#常见问题)

---

## 环境准备

### 1. 安装 Node.js 22.x

#### Windows

**方法1：使用官方安装包**

1. 访问 https://nodejs.org/
2. 下载 Node.js 22.x LTS 版本
3. 运行安装程序，按提示完成安装
4. 验证安装：
```cmd
node --version
npm --version
```

**方法2：使用 nvm-windows**

```cmd
# 下载 nvm-windows
# https://github.com/coreybutler/nvm-windows/releases

# 安装后运行
nvm install 22
nvm use 22
node --version
```

#### macOS

**方法1：使用 Homebrew**

```bash
# 安装 Homebrew（如果还没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node@22

# 验证安装
node --version
npm --version
```

**方法2：使用 nvm**

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重启终端或运行
source ~/.bashrc  # 或 source ~/.zshrc

# 安装 Node.js 22
nvm install 22
nvm use 22
node --version
```

#### Linux (Ubuntu/Debian)

```bash
# 使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# 或使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 2. 安装 pnpm

```bash
# 使用 npm 安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

### 3. 安装 MySQL 8.0

#### Windows

1. 下载 MySQL Installer：https://dev.mysql.com/downloads/installer/
2. 运行安装程序
3. 选择 "Developer Default" 或 "Server only"
4. 设置 root 密码
5. 完成安装

**启动 MySQL 服务：**

```cmd
# 使用服务管理器启动
# 或在命令行
net start MySQL80
```

#### macOS

```bash
# 使用 Homebrew
brew install mysql@8.0

# 启动 MySQL
brew services start mysql@8.0

# 设置 root 密码
mysql_secure_installation
```

#### Linux (Ubuntu/Debian)

```bash
# 安装 MySQL
sudo apt-get update
sudo apt-get install mysql-server

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 设置 root 密码
sudo mysql_secure_installation
```

---

## 方式一：开发模式运行

开发模式支持热重载，适合开发和调试。

### 步骤 1：克隆项目

```bash
# 克隆项目
git clone https://github.com/Kobevictor/medicine-reminder.git
cd medicine-reminder
```

### 步骤 2：安装依赖

```bash
# 安装所有依赖
pnpm install
```

**预期输出：**
```
Packages: +863
Progress: resolved 863, reused 755, downloaded 108, added 863, done
```

### 步骤 3：配置数据库

#### 3.1 创建数据库

```bash
# 登录 MySQL
mysql -u root -p
# 输入密码
```

在 MySQL 命令行中执行：

```sql
-- 创建数据库
CREATE DATABASE medicine_reminder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'medicine_user'@'localhost' IDENTIFIED BY 'your_password_here';

-- 授权
GRANT ALL PRIVILEGES ON medicine_reminder.* TO 'medicine_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

#### 3.2 配置环境变量

```bash
# 复制示例配置
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据库连接（修改为您的配置）
DATABASE_URL=mysql://medicine_user:your_password_here@localhost:3306/medicine_reminder

# JWT密钥（生成随机字符串）
JWT_SECRET=your-very-long-random-secret-key-change-this

# 服务器端口
PORT=3000

# 运行环境
NODE_ENV=development
```

**生成随机 JWT_SECRET：**

```bash
# 方法1：使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法2：使用 openssl（Linux/macOS）
openssl rand -base64 32

# 方法3：在线生成
# https://www.random.org/strings/
```

### 步骤 4：初始化数据库

```bash
# 生成数据库表结构
pnpm run db:push
```

**预期输出：**
```
✓ Database schema pushed successfully
```

### 步骤 5：启动开发服务器

```bash
# 启动开发模式
pnpm run dev
```

**预期输出：**
```
Server running on http://localhost:3000/
```

### 步骤 6：访问应用

打开浏览器访问：**http://localhost:3000**

您应该看到登录页面。

---

## 方式二：生产模式构建

生产模式会构建优化后的静态文件，适合部署到服务器。

### 步骤 1-4：同开发模式

按照开发模式的步骤 1-4 完成环境准备、依赖安装和数据库配置。

### 步骤 5：构建项目

```bash
# 构建前端和后端
pnpm run build
```

**构建过程：**

1. **前端构建**（Vite）
   - 编译 React + TypeScript
   - 压缩和优化静态资源
   - 输出到 `dist/public/`

2. **后端构建**（esbuild）
   - 编译 TypeScript
   - 打包所有依赖
   - 输出到 `dist/index.js`

**预期输出：**
```
vite v7.1.9 building for production...
✓ 1791 modules transformed.
rendering chunks...
computing gzip size...
../dist/public/index.html                 367.69 kB │ gzip: 105.61 kB
../dist/public/assets/index-VruJbaQM.css  122.83 kB │ gzip:  19.55 kB
../dist/public/assets/index-KfrFqNWc.js   632.45 kB │ gzip: 180.82 kB
✓ built in 4.90s

  dist/index.js  68.3kb
⚡ Done in 8ms
```

### 步骤 6：检查构建产物

```bash
# 查看构建结果
ls -la dist/

# 应该看到：
# dist/
# ├── index.js          # 服务器代码
# └── public/           # 前端静态文件
#     ├── index.html
#     └── assets/
```

### 步骤 7：启动生产服务器

```bash
# 设置环境变量为生产模式
export NODE_ENV=production  # Linux/macOS
# 或
set NODE_ENV=production     # Windows CMD
# 或
$env:NODE_ENV="production"  # Windows PowerShell

# 启动服务器
pnpm start
```

**或直接运行：**

```bash
NODE_ENV=production node dist/index.js
```

**预期输出：**
```
Server running on http://localhost:3000/
```

### 步骤 8：访问应用

打开浏览器访问：**http://localhost:3000**

---

## 数据库配置

### 连接字符串格式

```
mysql://[用户名]:[密码]@[主机]:[端口]/[数据库名]
```

### 示例配置

```env
# 本地开发（默认端口）
DATABASE_URL=mysql://medicine_user:password123@localhost:3306/medicine_reminder

# 本地开发（自定义端口）
DATABASE_URL=mysql://medicine_user:password123@localhost:3307/medicine_reminder

# 远程数据库
DATABASE_URL=mysql://user:pass@192.168.1.100:3306/medicine_reminder

# 云数据库（如 AWS RDS）
DATABASE_URL=mysql://admin:pass@mydb.abc123.us-east-1.rds.amazonaws.com:3306/medicine_reminder
```

### 数据库迁移

如果您更新了代码并且数据库结构有变化：

```bash
# 应用数据库迁移
pnpm run db:push

# 或手动执行 SQL 文件
mysql -u medicine_user -p medicine_reminder < drizzle/0003_local_auth.sql
```

---

## 项目结构说明

```
medicine-reminder/
├── client/                    # 前端源码
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   │   ├── Login.tsx     # 登录页面
│   │   │   ├── Home.tsx      # 首页
│   │   │   └── ...
│   │   ├── components/       # UI 组件
│   │   ├── hooks/            # React Hooks
│   │   └── lib/              # 工具函数
│   └── index.html            # HTML 模板
│
├── server/                    # 后端源码
│   ├── _core/
│   │   ├── auth.ts           # 认证服务
│   │   ├── trpc.ts           # tRPC 配置
│   │   └── index.ts          # 服务器入口
│   ├── db.ts                 # 数据库操作
│   └── routers.ts            # API 路由
│
├── drizzle/                   # 数据库
│   ├── schema.ts             # 数据库 Schema
│   └── *.sql                 # 迁移脚本
│
├── dist/                      # 构建输出（运行 build 后生成）
│   ├── index.js              # 服务器代码
│   └── public/               # 前端静态文件
│
├── package.json              # 项目依赖
├── vite.config.ts            # Vite 配置
├── tsconfig.json             # TypeScript 配置
└── .env                      # 环境变量（需自己创建）
```

---

## 常用命令

### 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器（热重载）
pnpm run dev

# 类型检查
pnpm run check

# 代码格式化
pnpm run format

# 运行测试
pnpm test
```

### 构建命令

```bash
# 构建生产版本
pnpm run build

# 启动生产服务器
pnpm start
```

### 数据库命令

```bash
# 生成并应用数据库迁移
pnpm run db:push

# 查看数据库状态
mysql -u medicine_user -p medicine_reminder -e "SHOW TABLES;"
```

---

## 常见问题

### Q1: `pnpm install` 失败

**问题：** 依赖安装失败

**解决方案：**

```bash
# 清理缓存
pnpm store prune

# 删除 node_modules 和 lock 文件
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

### Q2: 数据库连接失败

**问题：** `Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决方案：**

1. 检查 MySQL 是否运行：
```bash
# Linux/macOS
sudo systemctl status mysql

# Windows
net start | findstr MySQL
```

2. 检查连接字符串是否正确
3. 检查用户权限：
```sql
SHOW GRANTS FOR 'medicine_user'@'localhost';
```

### Q3: 端口 3000 被占用

**问题：** `Error: listen EADDRINUSE: address already in use :::3000`

**解决方案：**

**方法1：修改端口**

在 `.env` 文件中：
```env
PORT=8080
```

**方法2：杀死占用端口的进程**

```bash
# Linux/macOS
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Q4: 构建后无法访问

**问题：** 构建成功但浏览器显示 404

**解决方案：**

1. 确保 `NODE_ENV=production`
2. 检查 `dist/` 目录是否存在
3. 清理并重新构建：
```bash
rm -rf dist
pnpm run build
```

### Q5: TypeScript 编译错误

**问题：** `pnpm run check` 报错

**解决方案：**

```bash
# 清理并重新安装依赖
rm -rf node_modules
pnpm install

# 检查 TypeScript 版本
pnpm list typescript
```

### Q6: 数据库迁移失败

**问题：** `pnpm run db:push` 失败

**解决方案：**

1. 检查数据库连接
2. 手动执行迁移：
```bash
mysql -u medicine_user -p medicine_reminder < drizzle/0003_local_auth.sql
```

3. 如果表已存在，先删除：
```sql
DROP DATABASE medicine_reminder;
CREATE DATABASE medicine_reminder;
```

---

## 性能优化建议

### 开发模式

1. **使用 SSD 存储**：提高文件读写速度
2. **关闭不必要的进程**：释放系统资源
3. **增加 Node.js 内存限制**：
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm run dev
```

### 生产模式

1. **使用 PM2 管理进程**：
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name medicine-reminder

# 查看状态
pm2 status

# 查看日志
pm2 logs medicine-reminder

# 设置开机自启
pm2 startup
pm2 save
```

2. **配置反向代理（Nginx）**：

创建 `/etc/nginx/sites-available/medicine-reminder`：

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

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/medicine-reminder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 部署到服务器

### 使用 PM2 部署

```bash
# 1. 在服务器上克隆项目
git clone https://github.com/Kobevictor/medicine-reminder.git
cd medicine-reminder

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
nano .env

# 4. 初始化数据库
pnpm run db:push

# 5. 构建项目
pnpm run build

# 6. 使用 PM2 启动
pm2 start dist/index.js --name medicine-reminder -i max

# 7. 保存 PM2 配置
pm2 save
pm2 startup
```

### 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装新依赖
pnpm install

# 3. 运行数据库迁移
pnpm run db:push

# 4. 重新构建
pnpm run build

# 5. 重启应用
pm2 restart medicine-reminder
```

---

## 开发调试技巧

### 1. 查看实时日志

```bash
# 开发模式会自动显示日志
pnpm run dev

# 生产模式使用 PM2
pm2 logs medicine-reminder --lines 100
```

### 2. 调试数据库查询

在 `server/db.ts` 中添加日志：

```typescript
export async function createUser(data: any) {
  console.log('[DB] Creating user:', data);
  // ... 原有代码
}
```

### 3. 使用浏览器开发工具

- **Network 标签**：查看 API 请求
- **Console 标签**：查看前端错误
- **Application 标签**：查看 Cookie 和 LocalStorage

### 4. 数据库调试

```bash
# 连接数据库
mysql -u medicine_user -p medicine_reminder

# 查看所有用户
SELECT * FROM users;

# 查看药物列表
SELECT * FROM medications;

# 查看服药记录
SELECT * FROM medication_logs;
```

---

## 安全检查清单

部署前请确保：

- [ ] 修改了 `.env` 中的 `JWT_SECRET`
- [ ] 修改了数据库密码
- [ ] 不要将 `.env` 文件提交到 Git
- [ ] 生产环境使用 HTTPS
- [ ] 配置了防火墙规则
- [ ] 定期备份数据库
- [ ] 更新了所有依赖包

---

## 下一步

1. **配置 HTTPS**：使用 Let's Encrypt 获取免费 SSL 证书
2. **设置监控**：使用 PM2 Plus 或其他监控工具
3. **配置备份**：设置定时任务备份数据库
4. **优化性能**：使用 CDN 加速静态资源

---

## 获取帮助

- **文档**：查看 README.md 和其他文档
- **GitHub Issues**：https://github.com/Kobevictor/medicine-reminder/issues
- **社区支持**：提交 Issue 描述问题

---

**祝您构建顺利！** 🎉
