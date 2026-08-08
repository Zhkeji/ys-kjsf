@echo off
REM YS 论坛系统 — 一键启动（Windows）
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo   YS 论坛系统 启动中...
echo ==========================================

REM 1. 构建前端
if not exist "frontend\dist" (
  echo [1/3] 首次运行，构建前端...
  cd frontend
  if not exist node_modules call npm install
  call npm run build
  cd ..
) else (
  echo [1/3] 前端已构建，跳过
)

REM 2. 安装后端依赖
echo [2/3] 检查后端依赖...
cd backend
if not exist node_modules call npm install

REM 3. 启动服务
echo [3/3] 启动服务...
echo.
echo ==========================================
echo   本地访问: http://localhost:3001
echo   按 Ctrl+C 停止
echo ==========================================
node server.js
