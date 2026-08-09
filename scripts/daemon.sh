#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — 保活守护脚本
# 用途: 保持服务长期运行，进程崩溃自动重启，防止锁屏被杀
# 用法: bash scripts/daemon.sh
# 按 Ctrl+C 停止守护（会同时停止服务）

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$ROOT/.pids"
mkdir -p "$PID_DIR"

echo "=========================================="
echo "  YS 论坛系统 — 守护模式"
echo "  （进程崩溃自动重启 + 防锁屏杀）"
echo "=========================================="

# 1. 申请唤醒锁（防止锁屏被系统杀死）
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock 2>/dev/null
  echo "✓ 已获取唤醒锁（屏幕关闭后仍运行）"
fi

# 2. 停止旧实例
bash "$ROOT/scripts/stop.sh" >/dev/null 2>&1 || true
sleep 1

# 3. 守护循环
echo "启动守护进程..."
RESTART_COUNT=0

while true; do
  # 启动服务
  echo ""
  echo "[$(date '+%H:%M:%S')] 启动服务..."
  bash "$ROOT/scripts/start.sh" --no-daemon 2>&1 | tail -15

  # 检查后端是否存活
  SERVER_PID=""
  if [ -f "$PID_DIR/server.pid" ]; then
    SERVER_PID=$(cat "$PID_DIR/server.pid")
  fi

  if [ -z "$SERVER_PID" ] || ! kill -0 "$SERVER_PID" 2>/dev/null; then
    RESTART_COUNT=$((RESTART_COUNT + 1))
    echo ""
    echo "[$(date '+%H:%M:%S')] ⚠ 服务退出，第 $RESTART_COUNT 次，5秒后自动重启..."
    echo "  （按 Ctrl+C 停止守护）"
    sleep 5
  else
    # 服务正常运行，监控
    echo "[$(date '+%H:%M:%S')] 服务运行中，持续监控..."
    while kill -0 "$SERVER_PID" 2>/dev/null; do
      sleep 30
    done
    echo "[$(date '+%H:%M:%S')] ⚠ 后端进程消失，重启..."
  fi
done
