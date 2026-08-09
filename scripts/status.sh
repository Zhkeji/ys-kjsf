#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — 查看状态
# 用法: bash scripts/status.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$ROOT/.pids"
LOG_DIR="$ROOT/.logs"

echo "=========================================="
echo "  YS 论坛系统 — 运行状态"
echo "=========================================="

# 后端状态
if [ -f "$PID_DIR/server.pid" ]; then
  PID=$(cat "$PID_DIR/server.pid")
  if kill -0 "$PID" 2>/dev/null; then
    echo "✓ 后端: 运行中 (PID $PID)"
  else
    echo "✗ 后端: PID 文件存在但进程已死 (PID $PID)"
  fi
else
  echo "○ 后端: 未启动"
fi

# 隧道状态
if [ -f "$PID_DIR/tunnel.pid" ]; then
  PID=$(cat "$PID_DIR/tunnel.pid")
  if kill -0 "$PID" 2>/dev/null; then
    echo "✓ 隧道: 运行中 (PID $PID)"
    # 显示公网地址
    if [ -f "$LOG_DIR/tunnel.log" ]; then
      PUB_URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOG_DIR/tunnel.log" 2>/dev/null | head -1)
      [ -n "$PUB_URL" ] && echo "  公网: $PUB_URL"
    fi
  else
    echo "✗ 隧道: PID 文件存在但进程已死"
  fi
else
  echo "○ 隧道: 未启动"
fi

# 唤醒锁状态
if command -v termux-wake-lock >/dev/null 2>&1; then
  echo "✓ 唤醒锁: Termux 可用"
fi

# 本地访问检测
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null | grep -q "200"; then
  echo "✓ 本地: http://localhost:3001 可访问"
else
  echo "✗ 本地: 无法访问"
fi

echo "=========================================="
