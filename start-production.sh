#!/bin/bash

# 药物提醒系统 - 生产环境启动脚本

set -e

echo "======================================"
echo "  药物提醒系统 - 生产环境启动"
echo "======================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    echo "   安装指南: https://nodejs.org/"
    exit 1
fi

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，正在安装..."
    npm install -g pnpm
fi

echo "✅ 环境检查通过"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 文件，请先创建并配置"
    echo "   运行: cp .env.example .env"
    exit 1
fi

echo "✅ 环境配置文件已就绪"
echo ""

# 检查是否已构建
if [ ! -d "dist" ]; then
    echo "📦 项目未构建，开始构建..."
    pnpm install
    pnpm run build
    echo ""
fi

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 未安装，使用 Node.js 直接运行"
    echo "   建议安装 PM2: npm install -g pm2"
    echo ""
    
    # 设置环境变量
    export NODE_ENV=production
    
    echo "🚀 启动生产服务器..."
    node dist/index.js
else
    echo "🚀 使用 PM2 启动服务器..."
    
    # 停止旧进程
    pm2 delete medicine-reminder 2>/dev/null || true
    
    # 启动新进程
    pm2 start dist/index.js \
        --name medicine-reminder \
        --env production \
        -i max \
        --max-memory-restart 500M
    
    # 保存 PM2 配置
    pm2 save
    
    echo ""
    echo "======================================"
    echo "  ✅ 启动完成！"
    echo "======================================"
    echo ""
    echo "访问地址: http://localhost:3000"
    echo ""
    echo "PM2 常用命令："
    echo "  查看状态: pm2 status"
    echo "  查看日志: pm2 logs medicine-reminder"
    echo "  重启服务: pm2 restart medicine-reminder"
    echo "  停止服务: pm2 stop medicine-reminder"
    echo "  删除服务: pm2 delete medicine-reminder"
    echo ""
fi
