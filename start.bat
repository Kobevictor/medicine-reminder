@echo off
chcp 65001 >nul
echo ======================================
echo   药物提醒系统 - Windows 启动脚本
echo ======================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查 pnpm 是否安装
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ pnpm 未安装，正在安装...
    npm install -g pnpm
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ pnpm 安装失败
        pause
        exit /b 1
    )
)

echo ✅ 环境检查通过
echo.

REM 检查 .env 文件
if not exist .env (
    echo ⚠️  未找到 .env 文件，正在创建...
    copy .env.example .env
    echo ✅ 已创建 .env 文件
    echo.
    echo 重要提示：
    echo   1. 请编辑 .env 文件配置数据库连接
    echo   2. 修改 JWT_SECRET 为随机字符串
    echo   3. 保存后重新运行此脚本
    echo.
    pause
    exit /b 0
)

echo ✅ 环境配置文件已就绪
echo.

REM 检查 node_modules
if not exist node_modules (
    echo 📦 安装依赖...
    call pnpm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 🚀 启动开发服务器...
echo.
call pnpm run dev

pause
