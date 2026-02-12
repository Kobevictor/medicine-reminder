#!/bin/bash
# ============================================================
# Medicine Reminder - Docker 一键启动脚本
# ============================================================

set -e

echo "=========================================="
echo "  药物提醒系统 - Docker 部署"
echo "=========================================="
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：未检测到 Docker，请先安装 Docker"
    echo ""
    echo "安装方法："
    echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
    echo "  其他系统请访问: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否可用
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ 错误：未检测到 Docker Compose"
    echo "  请安装 Docker Compose 或更新 Docker 到最新版本"
    exit 1
fi

echo "✅ Docker 环境检测通过"
echo "   Docker: $(docker --version)"
echo "   Compose: $($COMPOSE_CMD version 2>/dev/null || echo 'available')"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 配置文件，正在从模板创建..."
    cp .env.example .env

    # 自动生成 JWT_SECRET
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|please-change-this-secret-key|${JWT_SECRET}|g" .env
    else
        sed -i "s|please-change-this-secret-key|${JWT_SECRET}|g" .env
    fi

    echo "✅ 已创建 .env 文件并自动生成 JWT_SECRET"
    echo ""
    echo "📝 请检查并按需修改 .env 文件中的配置："
    echo "   - MYSQL_ROOT_PASSWORD: MySQL root 密码"
    echo "   - MYSQL_PASSWORD: 应用数据库密码"
    echo "   - APP_PORT: 应用访问端口（默认3000）"
    echo ""
    read -p "是否继续启动？(y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消。请修改 .env 后重新运行此脚本。"
        exit 0
    fi
fi

echo ""
echo "🚀 正在启动服务..."
echo ""

# 构建并启动
$COMPOSE_CMD up -d --build

echo ""
echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo ""
echo "  🌐 访问地址: http://localhost:${APP_PORT:-3000}"
echo ""
echo "  📋 常用命令："
echo "    查看日志:    $COMPOSE_CMD logs -f"
echo "    查看状态:    $COMPOSE_CMD ps"
echo "    停止服务:    $COMPOSE_CMD down"
echo "    重启服务:    $COMPOSE_CMD restart"
echo "    重新构建:    $COMPOSE_CMD up -d --build"
echo "    删除数据:    $COMPOSE_CMD down -v"
echo ""
echo "  🔔 首次使用："
echo "    1. 打开浏览器访问上面的地址"
echo "    2. 点击「注册」创建账号"
echo "    3. 登录后点击「开启通知」允许桌面提醒"
echo "    4. 添加药物并设置提醒时间"
echo ""
