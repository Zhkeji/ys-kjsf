@echo off
REM YS 论坛系统 — 本地启动 + Cloudflare 隧道（Windows）
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo   YS 论坛系统 — 本地 + 公网隧道启动
echo ==========================================

REM 1. 构建前端
if not exist "frontend\dist" (
  echo [1/4] 首次运行，构建前端...
  cd frontend
  if not exist node_modules call npm install
  call npm run build
  cd ..
) else (
  echo [1/4] 前端已构建，跳过
)

REM 2. 安装后端依赖
echo [2/4] 检查后端依赖...
cd backend
if not exist node_modules call npm install
cd ..

REM 3. 下载 cloudflared
echo [3/4] 检查 cloudflared...
if not exist ".cloudflared\cloudflared.exe" (
  mkdir .cloudflared
  curl -L -o ".cloudflared\cloudflared.exe" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
)

REM 4. 启动后端 + 隧道
echo [4/4] 启动服务...
cd backend
start "YS-Backend" node server.js
cd ..

echo 等待后端启动...
timeout /t 3 /nobreak >nul

echo.
echo ==========================================
echo   本地访问: http://localhost:3001
echo   正在建立公网隧道...
echo   （查看新窗口中的 trycloudflare.com 地址）
echo   关闭此窗口和后端窗口以停止
echo ==========================================
.cloudflared\cloudflared.exe tunnel --url http://localhost:3001
