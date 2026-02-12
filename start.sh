#!/bin/bash

# 药物提醒系统启动脚本

set -e

echo "======================================"
echo "  药物提醒系统 - Docker 快速启动"
echo "======================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "   安装指南: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    echo "   安装指南: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker 环境检查通过"
echo ""

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在创建..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请编辑该文件配置数据库密码和JWT密钥"
    echo ""
    echo "重要提示："
    echo "  1. 修改 JWT_SECRET 为随机字符串"
    echo "  2. 修改所有默认密码"
    echo "  3. 保存后重新运行此脚本"
    echo ""
    exit 0
fi

echo "✅ 环境配置文件已就绪"
echo ""

# 停止现有容器
echo "🔄 停止现有容器..."
docker compose down 2>/dev/null || true
echo ""

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker compose build
echo ""

# 启动服务
echo "🚀 启动服务..."
docker compose up -d
echo ""

# 等待数据库就绪
echo "⏳ 等待数据库启动..."
sleep 10

# 初始化数据库
echo "📊 初始化数据库..."
docker compose exec -T app sh -c "pnpm run db:push" || {
    echo "⚠️  数据库初始化失败，可能已经初始化过"
}
echo ""

# 显示状态
echo "📊 服务状态："
docker compose ps
echo ""

echo "======================================"
echo "  ✅ 启动完成！"
echo "======================================"
echo ""
echo "访问地址: http://localhost:3000"
echo ""
echo "常用命令："
echo "  查看日志: docker compose logs -f"
echo "  停止服务: docker compose stop"
echo "  重启服务: docker compose restart"
echo "  完全清理: docker compose down -v"
echo ""
