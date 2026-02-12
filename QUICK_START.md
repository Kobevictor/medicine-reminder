# 快速入门指南

本指南帮助您在 **5 分钟内**快速启动药物提醒系统。

---

## 🎯 选择您的方式

### 方式 A：使用 Docker（最简单，推荐新手）

✅ **优点**：一键启动，无需配置环境  
❌ **缺点**：需要安装 Docker

[👉 跳转到 Docker 方式](#方式-a使用-docker)

---

### 方式 B：本地运行（适合开发者）

✅ **优点**：可以修改代码，支持热重载  
❌ **缺点**：需要安装 Node.js 和 MySQL

[👉 跳转到本地运行方式](#方式-b本地运行)

---

## 方式 A：使用 Docker

### 前提条件

- 已安装 Docker 和 Docker Compose
- 如果没有，请先安装：
  - **Windows/Mac**: 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop)
  - **Linux**: 运行 `curl -fsSL https://get.docker.com | sh`

### 步骤 1：克隆项目

```bash
git clone https://github.com/Kobevictor/medicine-reminder.git
cd medicine-reminder
```

### 步骤 2：配置环境变量

```bash
# 复制配置文件
cp .env.example .env

# 编辑配置（重要！）
# Windows: notepad .env
# Mac/Linux: nano .env
```

**必须修改的配置：**

```env
# 修改为随机字符串（重要！）
JWT_SECRET=请改成一个很长的随机字符串

# 修改数据库密码（建议）
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_PASSWORD=your_database_password
```

💡 **生成随机密钥：**

```bash
# 方法1（推荐）
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法2
# 访问 https://www.random.org/strings/ 生成随机字符串
```

### 步骤 3：一键启动

```bash
# Linux/Mac
./start.sh

# Windows（使用 Git Bash 或 WSL）
bash start.sh
```

### 步骤 4：访问应用

打开浏览器访问：**http://localhost:3000**

🎉 **完成！** 您应该看到登录页面。

---

## 方式 B：本地运行

### 前提条件

1. **Node.js 22.x**
   - 下载：https://nodejs.org/
   - 验证：`node --version`

2. **MySQL 8.0**
   - 下载：https://dev.mysql.com/downloads/
   - 验证：`mysql --version`

### 步骤 1：克隆项目

```bash
git clone https://github.com/Kobevictor/medicine-reminder.git
cd medicine-reminder
```

### 步骤 2：安装依赖

```bash
# 安装 pnpm（如果还没有）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 步骤 3：配置数据库

#### 3.1 创建数据库

```bash
# 登录 MySQL
mysql -u root -p
```

在 MySQL 中执行：

```sql
-- 创建数据库
CREATE DATABASE medicine_reminder;

-- 创建用户
CREATE USER 'medicine_user'@'localhost' IDENTIFIED BY 'your_password';

-- 授权
GRANT ALL PRIVILEGES ON medicine_reminder.* TO 'medicine_user'@'localhost';

-- 退出
EXIT;
```

#### 3.2 配置环境变量

```bash
# 复制配置文件
cp .env.example .env

# 编辑配置
# Windows: notepad .env
# Mac/Linux: nano .env
```

修改以下内容：

```env
# 数据库连接（修改密码）
DATABASE_URL=mysql://medicine_user:your_password@localhost:3306/medicine_reminder

# JWT密钥（生成随机字符串）
JWT_SECRET=your-random-secret-key

# 运行环境
NODE_ENV=development
```

### 步骤 4：初始化数据库

```bash
pnpm run db:push
```

### 步骤 5：启动应用

**开发模式（支持热重载）：**

```bash
# Linux/Mac
pnpm run dev

# Windows（双击运行）
start.bat
```

**生产模式：**

```bash
# 构建
pnpm run build

# 启动
pnpm start
```

### 步骤 6：访问应用

打开浏览器访问：**http://localhost:3000**

🎉 **完成！** 您应该看到登录页面。

---

## 📝 首次使用

### 1. 注册账号

1. 在登录页面点击"注册"标签
2. 填写信息：
   - **用户名**：admin（或您喜欢的名字）
   - **密码**：至少 6 位
   - **姓名**：可选
   - **邮箱**：可选
3. 点击"注册"
4. 自动登录成功

### 2. 添加第一个药物

1. 进入"药物管理"页面
2. 点击"添加药物"
3. 填写信息：
   - **药物名称**：阿司匹林
   - **剂量**：1片
   - **服用频率**：每日1次
   - **提醒时间**：08:00
   - **总量**：30
   - **剩余量**：30
4. 保存

### 3. 查看今日计划

返回首页，您将看到今日的服药计划。

---

## 🛠️ 常用命令

### Docker 方式

```bash
# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose stop

# 重启服务
docker compose restart

# 完全清理（删除数据）
docker compose down -v
```

### 本地运行方式

```bash
# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build

# 启动生产服务器
pnpm start

# 类型检查
pnpm run check

# 代码格式化
pnpm run format
```

---

## ❓ 常见问题

### Q1: 端口 3000 被占用

**解决方案：** 修改 `.env` 文件中的 `PORT=8080`

### Q2: 数据库连接失败

**检查清单：**
- [ ] MySQL 服务是否运行？
- [ ] 数据库是否已创建？
- [ ] 用户名和密码是否正确？
- [ ] `.env` 中的 `DATABASE_URL` 是否正确？

### Q3: Docker 启动失败

**解决方案：**

```bash
# 清理并重新启动
docker compose down
docker compose up -d --build

# 查看详细日志
docker compose logs -f
```

### Q4: 页面显示空白

**解决方案：**

1. 检查浏览器控制台是否有错误
2. 清除浏览器缓存
3. 尝试无痕模式访问

### Q5: 忘记密码

**解决方案：** 目前需要手动重置数据库中的密码，或重新注册新账号。

---

## 📚 更多文档

- **[README.md](./README.md)** - 项目介绍和功能说明
- **[LOCAL_BUILD_GUIDE.md](./LOCAL_BUILD_GUIDE.md)** - 详细的本地构建指南
- **[DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)** - Docker 部署完整指南
- **[INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md)** - 安装配置详细说明

---

## 🆘 获取帮助

遇到问题？

1. 查看 [常见问题](#常见问题) 部分
2. 查看详细文档（上方链接）
3. 提交 GitHub Issue: https://github.com/Kobevictor/medicine-reminder/issues

---

## 🎉 下一步

系统启动成功后，您可以：

1. ✅ 添加更多药物
2. ✅ 记录服药情况
3. ✅ 添加家人联系方式
4. ✅ 配置邮件通知（SMTP）
5. ✅ 查看服药历史和统计

---

**祝您使用愉快！** 💊
