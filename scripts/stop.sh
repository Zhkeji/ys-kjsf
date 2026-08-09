#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — 一键停止
# 用法: bash scripts/stop.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$ROOT/.pids"

echo "=========================================="
echo "  YS 论坛系统 — 停止服务"
echo "=========================================="

STOPPED=0

# 停止隧道
if [ -f "$PID_DIR/tunnel.pid" ]; then
  PID=$(cat "$PID_DIR/tunnel.pid")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null
    echo "✓ 隧道已停止 (PID $PID)"
    STOPPED=1
  fi
  rm -f "$PID_DIR/tunnel.pid"
fi

# 停止后端
if [ -f "$PID_DIR/server.pid" ]; then
  PID=$(cat "$PID_DIR/server.pid")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null
    sleep 1
    kill -9 "$PID" 2>/dev/null || true
    echo "✓ 后端已停止 (PID $PID)"
    STOPPED=1
  fi
  rm -f "$PID_DIR/server.pid"
fi

# 兜底：按端口杀进程
PIDS=$(ps aux 2>/dev/null | grep -E "node server\.js|cloudflared" | grep -v grep | awk '{print $2}')
if [ -n "$PIDS" ]; then
  for P in $PIDS; do
    kill "$P" 2>/dev/null || true
  done
  echo "✓ 已清理残留进程"
  STOPPED=1
fi

# 释放唤醒锁
if command -v termux-wake-unlock >/dev/null 2>&1; then
  termux-wake-unlock 2>/dev/null || true
  echo "✓ 已释放唤醒锁"
fi

if [ $STOPPED -eq 0 ]; then
  echo "（服务未在运行）"
fi

echo "=========================================="
echo "  已完全停止"
echo "=========================================="
