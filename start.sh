#!/usr/bin/env bash
# YS 论坛系统 — 一键启动（生产模式）
# 同时启动后端服务（含前端静态文件）

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  YS 论坛系统 启动中..."
echo "=========================================="

# 1. 构建前端
if [ ! -d "$ROOT/frontend/dist" ]; then
  echo "[1/3] 首次运行，构建前端..."
  cd "$ROOT/frontend"
  if [ ! -d node_modules ]; then npm install; fi
  npm run build
else
  echo "[1/3] 前端已构建，跳过"
fi

# 2. 安装后端依赖
echo "[2/3] 检查后端依赖..."
cd "$ROOT/backend"
if [ ! -d node_modules ]; then npm install; fi

# 3. 启动服务
echo "[3/3] 启动服务..."
echo ""
echo "=========================================="
echo "  本地访问: http://localhost:3001"
echo "  按 Ctrl+C 停止"
echo "=========================================="
exec node server.js
