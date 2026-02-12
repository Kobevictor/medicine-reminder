# 药物提醒系统 (Medicine Reminder System)

一个帮助用户按时服药的智能提醒系统，支持药物管理、服药记录、家人通知等功能。

## ✨ 主要功能

- 🔐 **本地用户认证**：支持用户注册和登录，无需第三方OAuth
- 💊 **药物管理**：添加、编辑、删除药物信息，包括剂量、频率、提醒时间等
- 📊 **服药记录**：记录每次服药情况，支持查看历史记录和统计
- 👨‍👩‍👧‍👦 **家人通知**：绑定家人联系方式，药物库存不足时自动通知
- 📧 **邮件提醒**：支持自定义SMTP配置，发送药物提醒和库存预警
- 📱 **响应式设计**：支持桌面和移动设备访问
- 🐳 **Docker部署**：一键部署，包含完整的数据库和应用服务

## 🚀 快速开始

### 方式一：使用 Docker（推荐）

1. **安装 Docker 和 Docker Compose**

   请参考 [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) 中的详细安装说明。

2. **克隆项目**

   ```bash
   git clone https://github.com/Kobevictor/medicine-reminder.git
   cd medicine-reminder
   ```

3. **配置环境变量**

   ```bash
   cp .env.example .env
   # 编辑 .env 文件，修改数据库密码和JWT密钥
   ```

4. **启动服务**

   ```bash
   docker compose up -d
   ```

5. **初始化数据库**

   ```bash
   docker compose exec app pnpm run db:push
   ```

6. **访问应用**

   打开浏览器访问：http://localhost:3000

### 方式二：本地开发

1. **环境要求**

   - Node.js 22.x
   - pnpm 10.x
   - MySQL 8.0

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **配置环境变量**

   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置数据库连接信息
   ```

4. **初始化数据库**

   ```bash
   pnpm run db:push
   ```

5. **启动开发服务器**

   ```bash
   pnpm run dev
   ```

6. **访问应用**

   打开浏览器访问：http://localhost:3000

## 📦 技术栈

### 前端
- **React 19** - UI框架
- **TypeScript** - 类型安全
- **TailwindCSS** - 样式框架
- **Radix UI** - 无障碍组件库
- **Wouter** - 轻量级路由
- **TanStack Query** - 数据获取和缓存

### 后端
- **Express** - Web框架
- **tRPC** - 类型安全的API
- **Drizzle ORM** - 数据库ORM
- **MySQL** - 关系型数据库
- **bcryptjs** - 密码加密
- **jose** - JWT认证

### 部署
- **Docker** - 容器化
- **Docker Compose** - 多容器编排
- **Vite** - 构建工具

## 🔧 环境变量配置

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接字符串 | `mysql://user:pass@localhost:3306/db` |
| `JWT_SECRET` | JWT加密密钥 | `your-secret-key` |
| `PORT` | 应用端口 | `3000` |
| `NODE_ENV` | 运行环境 | `production` / `development` |
| `MYSQL_ROOT_PASSWORD` | MySQL root密码 | `rootpassword` |
| `MYSQL_DATABASE` | 数据库名称 | `medicine_reminder` |
| `MYSQL_USER` | 数据库用户名 | `medicine_user` |
| `MYSQL_PASSWORD` | 数据库密码 | `medicine_password` |

## 📖 API文档

本项目使用 tRPC 提供类型安全的API。主要路由包括：

- `auth.me` - 获取当前用户信息
- `auth.logout` - 用户登出
- `medication.list` - 获取药物列表
- `medication.create` - 创建药物
- `medication.update` - 更新药物
- `medication.delete` - 删除药物
- `log.create` - 创建服药记录
- `log.today` - 获取今日服药记录
- `family.list` - 获取家人列表
- `family.create` - 添加家人
- `notification.list` - 获取通知列表

## 🗄️ 数据库结构

### users - 用户表
- `id` - 用户ID
- `username` - 用户名（唯一）
- `password` - 密码（bcrypt加密）
- `name` - 姓名
- `email` - 邮箱
- `role` - 角色（user/admin）

### medications - 药物表
- `id` - 药物ID
- `userId` - 用户ID
- `name` - 药物名称
- `dosage` - 剂量
- `frequency` - 服用频率
- `reminderTimes` - 提醒时间（JSON数组）
- `totalQuantity` - 总量
- `remainingQuantity` - 剩余量

### medication_logs - 服药记录表
- `id` - 记录ID
- `userId` - 用户ID
- `medicationId` - 药物ID
- `takenAt` - 服药时间
- `status` - 状态（taken/skipped/late）

### family_contacts - 家人联系人表
- `id` - 联系人ID
- `userId` - 用户ID
- `contactName` - 联系人姓名
- `contactEmail` - 联系人邮箱
- `notifyOnLowStock` - 是否通知库存不足

## 🔒 安全性

- ✅ 密码使用 bcrypt 加密存储
- ✅ JWT token 用于会话管理
- ✅ HTTPS 支持（生产环境推荐）
- ✅ SQL注入防护（使用参数化查询）
- ✅ XSS防护
- ✅ CSRF防护

## 📝 开发指南

### 项目结构

```
medicine-reminder/
├── client/              # 前端代码
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── pages/       # 页面组件
│   │   ├── hooks/       # 自定义Hooks
│   │   └── lib/         # 工具函数
├── server/              # 后端代码
│   ├── _core/           # 核心功能
│   │   ├── auth.ts      # 认证逻辑
│   │   ├── trpc.ts      # tRPC配置
│   │   └── index.ts     # 服务器入口
│   ├── db.ts            # 数据库操作
│   └── routers.ts       # API路由
├── drizzle/             # 数据库Schema和迁移
├── Dockerfile           # Docker镜像配置
├── docker-compose.yml   # Docker Compose配置
└── package.json         # 项目依赖
```

### 运行测试

```bash
pnpm test
```

### 代码格式化

```bash
pnpm run format
```

### 类型检查

```bash
pnpm run check
```

## 🐛 故障排查

详细的故障排查指南请参考 [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)。

常见问题：

1. **数据库连接失败**：检查 `DATABASE_URL` 配置是否正确
2. **端口冲突**：修改 `docker-compose.yml` 中的端口映射
3. **构建失败**：清理缓存后重新构建 `docker compose build --no-cache`

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

## 🙏 致谢

- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [tRPC](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Radix UI](https://www.radix-ui.com/)

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- GitHub Issues: https://github.com/Kobevictor/medicine-reminder/issues
- Email: your-email@example.com

---

**注意**：本系统仅用于辅助用药管理，不能替代医生的专业建议。如有任何健康问题，请咨询专业医疗人员。
